import * as fs from 'node:fs/promises'
import * as Diff2Html from 'diff2html';
import nodeHtmlToImage from 'node-html-to-image';
import * as os from 'os';

export const diff_file_path = "merge_request_diff.json";

export const parseGitLabUrl = (url: string): { projectId: string; mergeRequestIid: number; } | null => {
  // Регулярное выражение для GitLab MR URL
  const regex = /https?:\/\/gitlab\.[^\/]+\/(.+?)\/-\/merge_requests\/(\d+)/;
  const match = url.match(regex);

  if (!match || match.length < 3) {
    console.error('Некорректный URL Merge Request');
    return null;
  }

  return {
    projectId: match[1], // "nbt-core/microfrontends"
    mergeRequestIid: parseInt(match[2], 10) // 144
  };
};

export const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const urls = text.match(urlRegex);
  return urls || [];
}

export const chunkString = (str: string, size: number): string[] => {
    if (!str || typeof str !== 'string') {
        throw new Error('Input must be a non-empty string');
    }
    if (size <= 0) {
        throw new Error('Chunk size must be positive');
    }

    const chunks: string[] = [];
    for (let i = 0; i < str.length; i += size) {
        chunks.push(str.slice(i, i + size));
    }
    return chunks;
}

export const removeWhitespaceAndTabs = (inputString: string): string => {
  return inputString.replace(/\s/g, '');
}

export const saveDiffAsFile = async (diff: string, path: string = diff_file_path): Promise<void> => {
  try {
    await fs.writeFile(path, diff, 'utf-8');
  } catch (error) {
    console.error('Ошибка при запросе diff:', error instanceof Error ? error.message : error);
    throw error;
  }
}

export const generateDiffImage = async (rawDiff: string): Promise<Buffer> => {
  // 1. Генерируем HTML-разметку из сырого diff
  const diffHtml = Diff2Html.html(rawDiff, {
    drawFileList: false,
    matching: 'lines',
    outputFormat: 'line-by-line', // можно 'line-by-line'
  });

  console.log("diff -> html", rawDiff, diffHtml);

  // 2. Подключаем CSS для корректного отображения
  const fullHtml = `
        <html>
            <head>
                <!-- CSS -->
                <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css" />

                <!-- Javascripts -->
                <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/diff2html/bundles/js/diff2html.min.js"></script>
            </head>
            <body>${diffHtml}</body>
        </html>
    `;

  // 3. Рендерим в Buffer (без сохранения файла на диск)
  const image = await nodeHtmlToImage({
    html: fullHtml,
    encoding: 'binary',
    puppeteerArgs: { args: ['--no-sandbox'] } // полезно для Docker/Linux
  }) as Buffer;

  return image;
}

export const getComputerResources = () => {
  const data = {
    total_memory: (os.totalmem() / 1e9).toFixed(2), // GB
    free_memory: (os.freemem() / 1e9).toFixed(2), // GB
    cpu: os.cpus()
  };

  console.log('Total memory (bytes):', data.total_memory);
  console.log('Free memory (bytes):', data.free_memory);
  console.log('CPU info:', data.cpu);

  return data;
}