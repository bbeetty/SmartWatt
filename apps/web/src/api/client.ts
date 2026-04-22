import axios from 'axios'

const client = axios.create({ baseURL: '/api' })

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error?.message ?? err.message
    return Promise.reject(new Error(msg))
  },
)

export default client
