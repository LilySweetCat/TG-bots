import axios from "axios";
import config from './../config.json';

export const addCommentToMR = async (
    projectId: string,
    mergeRequestIid: number,
    comment: string
) => {
    const encodedProjectId = encodeURIComponent(projectId);
    const url = `${config.gitlab_url}/api/v4/projects/${encodedProjectId}/merge_requests/${mergeRequestIid}/discussions`;

    try {
        const response = await axios.post(
            url,
            { body: comment },
            {
                headers: {
                    'PRIVATE-TOKEN': config.gitlab_token,
                    'Content-Type': 'application/json',
                },
            }
        );
        console.log('Комментарий добавлен:', response.data);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Ошибка:', error.response?.data || error.message);
        } else {
            console.error('Неизвестная ошибка:', error);
        }
    }
}

export const approve = async (
    projectId: string,
    mergeRequestIid: number,
) => {
    const encodedProjectId = encodeURIComponent(projectId);
    const url = `${config.gitlab_url}/api/v4/projects/${encodedProjectId}/merge_requests/${mergeRequestIid}/approve`;

    try {
        const response = await axios.post(
            url,
            { approval_password: config.gitlab_password },
            {
                headers: {
                    'PRIVATE-TOKEN': config.gitlab_token,
                    'Content-Type': 'application/json',
                },
            }
        );
        console.log('Код был заапрувлен', JSON.stringify(response.data).toString());
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Ошибка:', error.response?.data || error.message);
        } else {
            console.error('Неизвестная ошибка:', error);
        }
    }
}


interface GitLabMRChanges {
    changes: Array<{
        old_path: string;
        new_path: string;
        diff: string;  // Вот этот git diff
    }>;
}


// Функция для получения информации о Merge Request
export const getMergeRequestDiff = async (
    projectId: string,       // ID проекта (например, "nbt-core/microfrontends")
    mergeRequestIid: number, // IID Merge Request (например, 144)
): Promise<string[]> => {
    try {
        // Кодируем projectId для URL (если содержит "/")
        const encodedProjectId = encodeURIComponent(projectId);

        // Формируем URL запроса
        const apiUrl = `${config.gitlab_url}/api/v4/projects/${encodedProjectId}/merge_requests/${mergeRequestIid}/changes`;

        // Выполняем GET-запрос к GitLab API
        const response = await axios.get<GitLabMRChanges>(apiUrl, {
            headers: {
                'PRIVATE-TOKEN': config.gitlab_token,
            },
        });

        const fullDiffText = response.data.changes.map(item => {
            return `--- a/${item.old_path}\n+++ b/${item.new_path}\n${item.diff}`;
        });

        return fullDiffText;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Ошибка при запросе к GitLab API:', error.response?.data || error.message);
        } else {
            console.error('Неизвестная ошибка:', error);
        }
        throw error;
    }
}