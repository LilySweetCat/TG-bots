
import axios from "axios";
import config from './../config.json';
import JiraApi from 'jira-client';

export const getTask = async (
    taskId: string
): Promise<string> => {
    var jira = new JiraApi({
        protocol: 'https',
        host: config.jira_url,
        username: config.jira_email,
        password: config.jira_password,
        apiVersion: '2',
        strictSSL: true
    });

    const issue = await jira.findIssue(taskId);

    return JSON.stringify(issue);
};
