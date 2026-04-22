import type { ThemeConfig } from 'antd';

export const themeToken: ThemeConfig = {
  token: {
    colorPrimary: '#299C87',
    colorSuccess: '#52c41a',    // 節能達標、正向數字
    colorWarning: '#faad14',    // 用電偏高提示
    colorError: '#ff4d4f',      // 超出預算
    borderRadius: 8,
    fontSize: 14,
    fontFamily: '"Noto Sans TC", "PingFang TC", sans-serif',
  },
  components: {
    Layout: {
      siderBg: '#175247',
      triggerBg: '#003366',
    },
    Menu: {
      darkItemBg: '#175247',
      darkSubMenuItemBg: '#175247',
      darkPopupBg: '#175247',
    },
    Statistic: {
      titleFontSize: 13,
    },
  },
};
