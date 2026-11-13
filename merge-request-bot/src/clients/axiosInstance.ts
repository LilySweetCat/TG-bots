import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GITLAB_TOKEN = process.env.GITLAB_ACCESS_TOKEN;

const axiosInstance = axios.create({
  headers: {
    'PRIVATE-TOKEN': GITLAB_TOKEN,
  },
});

export default axiosInstance;
