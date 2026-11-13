import TelegramBot from 'node-telegram-bot-api';
import {SocksProxyAgent} from 'socks-proxy-agent/dist'

import { chunkString, generateDiffImage, getComputerResources, parseGitLabUrl } from './utils';
import config from './../config.json';
import { addCommentToMR, approve, getMergeRequestDiff } from './gitlab';
import { getTask } from './jira';
import { askLLM } from './llm';

type StatusType = "idle" | "getdiffmr" | "approvemr" | "askllm" | "addcomment" | "waitcomment" | "gettask";

console.log("Запускаюся....");

let bot : TelegramBot;
if(config.use_proxy){
    const agent = new SocksProxyAgent(config.proxy);

    // @ts-ignore
    bot = new TelegramBot(config.telegram_token, { polling: true, request: { agent: agent } });
} else {
    bot = new TelegramBot(config.telegram_token, { polling: true});
}

let status: StatusType = 'idle';
let mr_data: { projectId: string; mergeRequestIid: number; };

const postBotResponse = async (message: string, chatId: TelegramBot.ChatId) => {
    if (message && message?.length >= config.max_message_size) {
        const message_chunks = chunkString(message, config.max_message_size);

        message_chunks.forEach(async chunk => {
            await bot.sendMessage(chatId, chunk);
        })
    } else {
        await bot.sendMessage(chatId, message);
    }
}

bot.on('message', async (msg) => {
    try {
        if (msg.text?.toString() === "/getdiffmr") {
            status = 'getdiffmr';

            postBotResponse("Дайте ссылку на MR", msg.chat.id);
            console.log("получил запрос на diff");
            return;
        }

        if (msg.text?.toString() === "/approvemr") {
            status = 'approvemr';

            postBotResponse("Дайте ссылку на MR", msg.chat.id);
            console.log("получил запрос на аппрув");
            return;
        }

        if (msg.text?.toString() === "/addcomment") {
            status = 'addcomment';

            postBotResponse("Дайте ссылку на MR", msg.chat.id);
            console.log("получил запрос на коммент");
            return;
        }

        if (msg.text?.toString() === "/gettask") {
            status = 'gettask';

            postBotResponse("Дайте ссылку задачу в Jira", msg.chat.id);
            console.log("получил запрос на задачу в jira");
            return;
        }

        if (msg.text?.toString() === "/askllm") {
            status = "askllm";

            const pc_resouces = getComputerResources();
            postBotResponse(`Сейчас доступно ОЗУ: ${pc_resouces.free_memory} GB`, msg.chat.id);

            if (Number(pc_resouces.free_memory) <= 10) {
                postBotResponse("Сейчас недостаточно ОЗУ", msg.chat.id);
                return;
            }

            postBotResponse("Дайте ссылку на MR", msg.chat.id);
            console.log("получил запрос на LLM");
            return;
        }

        if (status != 'idle' && ['addcomment', 'approvemr', 'getdiffmr', 'askllm'].includes(status)) {
            const parse_result = parseGitLabUrl(msg.text ?? "");

            if (parse_result?.projectId === undefined || parse_result.mergeRequestIid === undefined) {
                postBotResponse("Неверная ссылка на MR", msg.chat.id);
                return;
            }

            switch (status) {
                case 'getdiffmr':
                    await ProcessGetDiff(parse_result, msg);
                    break;
                case "approvemr":
                    await ProcessApprove(parse_result, msg);
                    break;
                case "addcomment":
                    await ProcessAddComment(parse_result, msg);
                    break;
                case "askllm":
                    await ProcessAskLLM(parse_result, msg);
                    break;
                default:
                    status = "idle";
                    break;
            }
        }
        else if (status !== "idle") {
            switch (status) {
                case "waitcomment":
                    await ProcessWaitComment(msg);
                    break;
                case "gettask":
                    await ProcessGetTask(msg);
                    break;
                default:
                    status = "idle";
                    break;
            }
        }

    } catch (error) {
        console.log("Произошла ошибка:", error);
        postBotResponse(`Произошла ошибка: ${error}`, msg.chat.id);
    }
});

console.log("Прослушиваю сообщения...")


async function ProcessGetTask(msg: TelegramBot.Message) {
    try {
        const task = await getTask(msg.text?.toString() ?? "");
        postBotResponse(task, msg.chat.id);
    } catch (error: any) {
        console.log(error.toString());
    } finally {
        status = "idle";
    }
}

async function ProcessWaitComment(msg: TelegramBot.Message) {
    await addCommentToMR(mr_data.projectId, mr_data.mergeRequestIid, msg.text ?? "");
    postBotResponse(`Добавлен комментарий: ${msg.text}`, msg.chat.id);
    status = "idle";
}

async function ProcessAskLLM(parse_result: { projectId: string; mergeRequestIid: number; }, msg: TelegramBot.Message) {
    try {
        const diffs = await getMergeRequestDiff(parse_result?.projectId, parse_result?.mergeRequestIid);

        const base64: string[] = [];
        diffs.forEach(async (diff) => {
            const image = await generateDiffImage(diff);
            base64.push(image.toString('base64'));
        });
        console.log("prepared all images as base64");
        const response = await askLLM(base64);

        console.log("got response", response);
        postBotResponse(response, msg.chat.id);
    } catch (error: any) {
        postBotResponse(error.toString(), msg.chat.id);
    } finally {
        status = "idle";
    }
}

async function ProcessAddComment(parse_result: { projectId: string; mergeRequestIid: number; }, msg: TelegramBot.Message) {
    mr_data = parse_result;

    postBotResponse(`Пришлите комментарий`, msg.chat.id);

    status = 'waitcomment';
}

async function ProcessApprove(parse_result: { projectId: string; mergeRequestIid: number; }, msg: TelegramBot.Message) {
    await approve(parse_result.projectId, parse_result.mergeRequestIid);
    postBotResponse("Сделано", msg.chat.id);
    status = "idle";
}

async function ProcessGetDiff(parse_result: { projectId: string; mergeRequestIid: number; }, msg: TelegramBot.Message) {
    const diffs = await getMergeRequestDiff(parse_result?.projectId, parse_result?.mergeRequestIid);

    diffs.forEach(async (diff) => {
        const image = await generateDiffImage(diff);

        bot.sendPhoto(msg.chat.id, image);
    });
    status = "idle";
}
