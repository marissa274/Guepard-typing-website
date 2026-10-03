import '../src/style.css';
import '../src/jungle.css';
import '../src/auth.css';
import '../src/lobby.css';
import './globals.css';
import { SiteProvider } from '../src/components/SiteContext';
export const metadata = {title:'GUÉPARD — Typing at full speed.',description:'Courses de frappe dans une jungle illustrée. Rejoignez une course ou créez un salon privé de démonstration.'};
export default function RootLayout({children}) {return <html lang="fr" suppressHydrationWarning><body><SiteProvider>{children}</SiteProvider></body></html>}
