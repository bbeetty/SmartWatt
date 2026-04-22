import type { ThemeConfig } from 'antd';

export const themeToken: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',    // AntD 預設藍
    colorSuccess: '#52c41a',    // 節能達標、正向數字
    colorWarning: '#faad14',    // 用電偏高提示
    colorError: '#ff4d4f',      // 超出預算
    borderRadius: 8,
    fontSize: 14,
    fontFamily: '"Noto Sans TC", "PingFang TC", sans-serif',
  },
  components: {
    Layout: {
      siderBg: '#001529',       // AntD 深色 Sider 預設
      triggerBg: '#002140',
    },
    Statistic: {
      titleFontSize: 13,
    },
  },
};
