import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../cart/useCart'
import BottomNav, { type Tab } from './BottomNav'

const TAB_PATH: Record<Tab, string> = {
  home: '/',
  discover: '/discover',
  bag: '/cart',
  account: '/account',
}

function tabFor(pathname: string): Tab {
  if (pathname.startsWith('/discover') || pathname.startsWith('/product')) return 'discover'
  if (pathname.startsWith('/cart') || pathname.startsWith('/checkout')) return 'bag'
  if (pathname.startsWith('/account') || pathname.startsWith('/orders')) return 'account'
  return 'home'
}

/** The phone frame: page content + the glass bottom navigation. */
export default function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { count } = useCart()

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-32 pt-6">
      <Outlet />
      <BottomNav active={tabFor(pathname)} bagCount={count} onChange={(tab) => navigate(TAB_PATH[tab])} />
    </main>
  )
}
