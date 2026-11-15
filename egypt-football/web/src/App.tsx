import Home, { loadHome } from '@/pages/Home';
import { Championship, Championships, Club, Clubs, Player, Players, Team, Teams, Timeline, loadChampionship, loadChampionships, loadClub, loadClubs, loadPlayer, loadPlayers, loadTeam, loadTeams, loadTimeline } from '@/pages/Archive';
import { Article, News, loadArticle, loadNews } from '@/pages/News';
import { Search, loadSearch } from '@/pages/Search';
import { Message } from '@/components/ui';
import { Router, type RouteDef } from '@/lib/router';

const routes: RouteDef[] = [
  { pattern: /^\/$/, load: loadHome, render: (d) => <Home data={d} /> },
  { pattern: /^\/players\/?$/, load: (_, q) => loadPlayers(q), render: (d, q) => <Players data={d} query={q} />, title: () => 'اللاعبون' },
  { pattern: /^\/players\/([^/]+)$/, load: loadPlayer, render: (d) => <Player data={d} />, title: (d) => d.name_ar || d.name_en },
  { pattern: /^\/clubs\/?$/, load: loadClubs, render: (d) => <Clubs data={d} />, title: () => 'الأندية' },
  { pattern: /^\/clubs\/([^/]+)$/, load: loadClub, render: (d) => <Club data={d} />, title: (d) => d.name_ar || d.name_en },
  { pattern: /^\/championships\/?$/, load: loadChampionships, render: (d) => <Championships data={d} />, title: () => 'البطولات' },
  { pattern: /^\/championships\/([^/]+)$/, load: loadChampionship, render: (d) => <Championship data={d} />, title: (d) => d.name_ar || d.name_en },
  { pattern: /^\/national-teams\/?$/, load: loadTeams, render: (d) => <Teams data={d} />, title: () => 'المنتخبات' },
  { pattern: /^\/national-teams\/([^/]+)$/, load: loadTeam, render: (d) => <Team data={d} />, title: (d) => d.name_ar || d.name_en },
  { pattern: /^\/timeline\/?$/, load: loadTimeline, render: (d) => <Timeline data={d} />, title: () => 'الخط الزمني' },
  { pattern: /^\/news\/?$/, load: loadNews, render: (d) => <News data={d} />, title: () => 'الأخبار' },
  { pattern: /^\/news\/(\d+)$/, load: loadArticle, render: (d) => <Article data={d} />, title: (d) => d.title },
  { pattern: /^\/search\/?$/, load: loadSearch, render: (d) => <Search data={d} />, title: () => 'البحث' },
];

function App() {
  return (
    <Router
      routes={routes}
      notFound={<Message title="الصفحة غير موجودة" body="لم نجد هذه الصفحة في الأرشيف. ربما تغيّر عنوانها." />}
      failed={<Message title="حدث خطأ" body="تعذّر تحميل الصفحة. حاول مرة أخرى بعد قليل." />}
    />
  );
}

export default App;
