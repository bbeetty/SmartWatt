import { useState } from 'react'
import { Layout, Menu, Grid, Drawer, Button } from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'

const { Sider, Content, Header } = Layout
const { useBreakpoint } = Grid

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '儀表板' },
  { key: '/bills', icon: <FileTextOutlined />, label: '帳單管理' },
  { key: '/appliances', icon: <ThunderboltOutlined />, label: '家電管理' },
  { key: '/usage', icon: <FileTextOutlined />, label: '每日用電' },
  { key: '/settings', icon: <SettingOutlined />, label: '系統設定' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const screens = useBreakpoint()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const isMobile = !screens.lg

  const commonMenu = (
    <Menu
      theme={isMobile ? 'light' : 'dark'}
      mode="inline"
      selectedKeys={[pathname]}
      items={menuItems}
      onClick={({ key }) => {
        navigate(key)
        setIsDrawerOpen(false)
      }}
    />
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider width={200} theme="dark">
          <div style={{ height: 32, margin: 16, background: 'rgba(255,255,255,.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>
            ⚡ SmartWatt
          </div>
          {commonMenu}
        </Sider>
      )}

      <Drawer
        title="SmartWatt"
        placement="left"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        styles={{ body: { padding: 0 } }}
        size="default"
      >
        {commonMenu}
      </Drawer>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 2px 8px #f0f1f2', zIndex: 1 }}>
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setIsDrawerOpen(true)}
              style={{ fontSize: 16, width: 64, height: 64 }}
            />
          )}
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {menuItems.find((m) => m.key === pathname)?.label ?? 'SmartWatt'}
          </div>
        </Header>
        <Content style={{ margin: isMobile ? '16px' : '24px', overflow: 'initial' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
