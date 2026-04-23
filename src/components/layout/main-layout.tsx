import { Navbar } from './navbar'
import { Footer } from './footer'
import { MainLayoutClient } from './main-layout-client'

export function MainLayout({ children }: { children: React.ReactNode }) {
 return (
   <MainLayoutClient navbar={<Navbar />} footer={<Footer />}>
     {children}
   </MainLayoutClient>
 )
}
