// Seed data for the MVP. It is a starting set, not the full archive: editors should
// verify and extend it in the admin dashboard. Figures that change often or are disputed
// (caps, goals, live stats) are left empty rather than guessed.

import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db, run, get } from './db.js';
import { hashPassword } from './auth.js';
import { applyArabic, ARABIC_NEWS } from './seed-ar.js';

const ERAS = [
  ['founding', 'The founding years', 'سنوات التأسيس', 1907, 1933, 'Clubs are born in Cairo, Alexandria and Port Said; the FA is founded in 1921 and Egypt plays at the 1920, 1924 and 1928 Olympics.'],
  ['first-world-cup', 'Africa’s first World Cup nation', 'أول منتخب أفريقي في كأس العالم', 1934, 1956, 'Egypt becomes the first African and Arab side at a World Cup (Italy 1934). The national league starts in 1948.'],
  ['pan-african', 'Pan-African pioneers', 'رواد القارة', 1957, 1979, 'Egypt co-founds CAF and wins two of the first three Africa Cup of Nations. Ismaily become the first Egyptian club champions of Africa.'],
  ['golden-derby', 'The great derby era', 'عصر القمة', 1980, 1999, 'Al Ahly and Zamalek dominate Africa; the Pharaohs return to the World Cup in 1990 and win the 1986 and 1998 AFCONs.'],
  ['shehata', 'Three in a row', 'الثلاثية', 2000, 2011, 'Under Hassan Shehata Egypt win the Africa Cup of Nations in 2006, 2008 and 2010.'],
  ['global', 'The global era', 'العصر العالمي', 2012, null, 'Egyptian players star in Europe’s top leagues; Egypt reaches the 2018 and 2026 World Cups.'],
];

const CLUBS = [
  { slug: 'al-ahly', name_en: 'Al Ahly SC', name_ar: 'النادي الأهلي', nickname_en: 'The Red Devils', city: 'Cairo', founded_year: 1907,
    stadium: 'Cairo International Stadium', colors: '#C8102E,#FFFFFF',
    history_en: 'Founded on 24 April 1907 as a club for Egyptian students, Al Ahly ("The National") became a symbol of the national movement. It won the first eleven editions of the Egyptian Premier League from 1948–49 and is the most successful club in African club football, with a record number of CAF Champions League titles.',
    milestones: [[1907, 'founded', 'Club founded in Cairo'], [1948, 'title', 'Wins the first Egyptian Premier League season'], [1982, 'title', 'First African Cup of Champions Clubs'], [2001, 'title', 'Fourth African title opens a decade of dominance'], [2006, 'title', 'Third place at the FIFA Club World Cup']] },
  { slug: 'zamalek', name_en: 'Zamalek SC', name_ar: 'نادي الزمالك', nickname_en: 'The White Knights', city: 'Giza', founded_year: 1911,
    stadium: 'Cairo International Stadium', colors: '#FFFFFF,#C8102E',
    history_en: 'Founded on 5 January 1911 as Qasr El Nil, the club was later known as El Mokhtalat and then Farouk, before taking the name Zamalek in 1952. Five-time champions of Africa and Al Ahly’s great rival in the Cairo derby.',
    milestones: [[1911, 'founded', 'Founded as Qasr El Nil'], [1913, 'renamed', 'Renamed El Mokhtalat'], [1941, 'renamed', 'Renamed Farouk'], [1952, 'renamed', 'Takes the name Zamalek'], [1984, 'title', 'First African Cup of Champions Clubs']] },
  { slug: 'ismaily', name_en: 'Ismaily SC', name_ar: 'النادي الإسماعيلي', nickname_en: 'The Brazilians of Egypt', city: 'Ismailia', founded_year: 1924,
    stadium: 'Ismailia Stadium', colors: '#FFD100,#0057B8',
    history_en: 'Known for an attacking, Brazilian-inspired style and its yellow shirts. In 1969 Ismaily became the first Egyptian club to win the African Cup of Champions Clubs.',
    milestones: [[1924, 'founded', 'Club founded in Ismailia'], [1967, 'title', 'First Egyptian league title'], [1969, 'title', 'Champions of Africa']] },
  { slug: 'al-masry', name_en: 'Al Masry SC', name_ar: 'النادي المصري', nickname_en: 'The Green Eagles', city: 'Port Said', founded_year: 1920,
    stadium: 'Port Said Stadium', colors: '#00843D,#FFFFFF',
    history_en: 'The club of Port Said, founded in 1920. Its stadium was the scene of the February 2012 disaster in which 72 Al Ahly supporters were killed, which led to the suspension of the league.',
    milestones: [[1920, 'founded', 'Club founded in Port Said']] },
  { slug: 'al-ittihad-alexandria', name_en: 'Al Ittihad Alexandria', name_ar: 'الاتحاد السكندري', nickname_en: 'Zaeem El Thaghr', city: 'Alexandria', founded_year: 1914,
    stadium: 'Alexandria Stadium', colors: '#00843D,#FFFFFF',
    history_en: 'Alexandria’s best-known club, founded in 1914, with several Egypt Cup titles.',
    milestones: [[1914, 'founded', 'Club founded in Alexandria']] },
  { slug: 'tersana', name_en: 'Tersana SC', name_ar: 'نادي الترسانة', nickname_en: 'El Shawakeesh', city: 'Giza', founded_year: 1921,
    stadium: 'Tersana Stadium', colors: '#0057B8,#FFFFFF',
    history_en: 'A historic Giza club, league champions in 1962–63 and the first club of Mohamed Aboutrika.',
    milestones: [[1921, 'founded', 'Club founded'], [1963, 'title', 'Egyptian Premier League champions']] },
  { slug: 'arab-contractors', name_en: 'El Mokawloon El Arab', name_ar: 'المقاولون العرب', nickname_en: 'The Arab Contractors', city: 'Cairo', founded_year: 1973,
    stadium: 'Osman Ahmed Osman Stadium', colors: '#FFD100,#000000',
    history_en: 'The works club of the Arab Contractors company. Winners of the African Cup Winners’ Cup in 1982 and 1983, and the first professional club of Mohamed Salah and Mohamed Elneny.',
    milestones: [[1973, 'founded', 'Club founded'], [1982, 'title', 'African Cup Winners’ Cup'], [1983, 'title', 'Retains the Cup Winners’ Cup and wins the league']] },
  { slug: 'pyramids', name_en: 'Pyramids FC', name_ar: 'نادي بيراميدز', nickname_en: 'The Sky Blues', city: 'Cairo', founded_year: 2008,
    stadium: '30 June Stadium', colors: '#00A3E0,#0B1F3A',
    history_en: 'Founded in 2008 as Al Assiouty Sport and renamed Pyramids FC in 2018. Champions of Africa in 2025.',
    milestones: [[2008, 'founded', 'Founded as Al Assiouty Sport'], [2018, 'renamed', 'Renamed Pyramids FC'], [2025, 'title', 'CAF Champions League winners']] },
  { slug: 'ghazl-el-mahalla', name_en: 'Ghazl El Mahalla', name_ar: 'غزل المحلة', nickname_en: 'The Workers', city: 'El Mahalla El Kubra', founded_year: 1936,
    stadium: 'Ghazl El Mahalla Stadium', colors: '#FFD100,#0057B8',
    history_en: 'The club of Egypt’s textile city, league champions in 1972–73.', milestones: [[1973, 'title', 'Egyptian Premier League champions']] },
  { slug: 'olympic-club', name_en: 'Olympic Club', name_ar: 'النادي الأولمبي', nickname_en: null, city: 'Alexandria', founded_year: 1905,
    stadium: 'Alexandria Stadium', colors: '#0057B8,#FFFFFF',
    history_en: 'One of Egypt’s oldest clubs, league champions in 1965–66.', milestones: [[1966, 'title', 'Egyptian Premier League champions']] },
];

// [slug, name_en, name_ar, nickname, birth, death, birthplace, pos, era, legend, bio, spells[[club_slug|name, from, to]]]
const PLAYERS = [
  ['mokhtar-el-tetsh', 'Mokhtar El Tetsh', 'مختار التتش', 'El Tetsh', '1905', '1965', 'Cairo', 'FW', 'founding', 1,
    'Al Ahly’s first great star and captain, who played for Egypt at the Olympic Games in the 1920s. Al Ahly’s training stadium in Gezira carries his name.',
    [['al-ahly', null, null]]],
  ['abdelrahman-fawzi', 'Abdelrahman Fawzi', 'عبد الرحمن فوزي', null, '1909', '1988', 'Port Said', 'FW', 'first-world-cup', 1,
    'Scored both of Egypt’s goals against Hungary at the 1934 World Cup in Naples, the first goals by an African player at the tournament.', []],
  ['saleh-selim', 'Saleh Selim', 'صالح سليم', 'El Maestro', '1930-09-11', '2002-05-06', 'Cairo', 'FW', 'first-world-cup', 1,
    'An elegant forward who spent almost his whole career at Al Ahly, with a spell in Austria at Grazer AK. He later served as Al Ahly president for two long terms and is remembered as the embodiment of the club’s values.',
    [['al-ahly', 1944, 1963], ['Grazer AK', 1962, 1963]]],
  ['hassan-shehata', 'Hassan Shehata', 'حسن شحاتة', 'El Me’alem', '1949-06-19', null, 'Kafr El Dawwar', 'COACH', 'shehata', 1,
    'A Zamalek forward in the 1960s and 70s who became the most successful coach in African history: he led Egypt to three consecutive Africa Cup of Nations titles in 2006, 2008 and 2010.',
    [['zamalek', null, null]]],
  ['mahmoud-el-khatib', 'Mahmoud El Khatib', 'محمود الخطيب', 'Bibo', '1954-10-30', null, 'Dakahlia', 'FW', 'golden-derby', 1,
    'Al Ahly’s greatest idol, a gifted forward who played his entire career at the club (1972–1988). African Footballer of the Year in 1983 and an Africa Cup of Nations winner in 1986. Elected Al Ahly president in 2017.',
    [['al-ahly', 1972, 1988]]],
  ['magdi-abdelghani', 'Magdi Abdelghani', 'مجدي عبد الغني', null, '1959-07-27', null, 'Cairo', 'MF', 'golden-derby', 0,
    'Scored Egypt’s penalty in the 1–1 draw with the Netherlands at Italia ’90, the country’s first World Cup goal in 56 years.',
    [['al-ahly', null, null], ['Beira-Mar', null, null]]],
  ['hossam-hassan', 'Hossam Hassan', 'حسام حسن', 'El Ameed', '1966-08-10', null, 'Cairo', 'FW', 'golden-derby', 1,
    'Egypt’s all-time leading scorer. A fierce centre-forward who played at the 1990 World Cup and won the Africa Cup of Nations in 1986, 1998 and 2006. Played for Al Ahly and Zamalek as well as PAOK, Neuchâtel Xamax and Al Ain, and was appointed Egypt head coach in 2024.',
    [['al-ahly', 1984, 1990], ['PAOK', 1990, 1991], ['Neuchâtel Xamax', 1991, 1992], ['al-ahly', 1992, 2000], ['zamalek', 2000, 2004], ['al-masry', 2004, 2006]]],
  ['hany-ramzy', 'Hany Ramzy', 'هاني رمزي', null, '1969-03-10', null, 'Cairo', 'DF', 'golden-derby', 0,
    'A commanding defender who played at the 1990 World Cup and spent most of his career in Switzerland and Germany, including Werder Bremen and Kaiserslautern.',
    [['al-ahly', null, null], ['Neuchâtel Xamax', null, null], ['Werder Bremen', null, null], ['1. FC Kaiserslautern', null, null]]],
  ['essam-el-hadary', 'Essam El Hadary', 'عصام الحضري', 'The High Dam', '1973-01-15', null, 'Kafr El Battikh', 'GK', 'shehata', 1,
    'A four-time Africa Cup of Nations winner (1998, 2006, 2008, 2010). At 45 he became the oldest player to appear at a World Cup, against Saudi Arabia in 2018, and saved a penalty in that match.',
    [['al-ahly', 1996, 2008], ['FC Sion', 2008, 2009], ['ismaily', 2009, 2010], ['zamalek', 2010, 2011]]],
  ['ahmed-hassan', 'Ahmed Hassan', 'أحمد حسن', 'The Pharaoh’s Hawk', '1975-05-02', null, 'Maghagha', 'MF', 'shehata', 1,
    'Egypt’s most-capped player and the only player to win four Africa Cup of Nations titles (1998, 2006, 2008, 2010). A long career in Turkey with Beşiktaş and others, then Anderlecht, before returning to Al Ahly.',
    [['arab-contractors', null, null], ['Kocaelispor', null, null], ['Beşiktaş', null, null], ['Anderlecht', null, null], ['al-ahly', null, null], ['zamalek', null, null]]],
  ['mohamed-aboutrika', 'Mohamed Aboutrika', 'محمد أبو تريكة', 'The Smiling Assassin', '1978-11-07', null, 'Giza', 'MF', 'shehata', 1,
    'The playmaker of the Shehata era. He scored the deciding penalty in the 2006 Africa Cup of Nations final and the only goal of the 2008 final against Cameroon, and won multiple African titles with Al Ahly.',
    [['tersana', 1997, 2004], ['al-ahly', 2004, 2013]]],
  ['mohamed-salah', 'Mohamed Salah', 'محمد صلاح', 'The Egyptian King', '1992-06-15', null, 'Nagrig, Gharbia', 'FW', 'global', 1,
    'From Nagrig to Liverpool. After starting at El Mokawloon he moved to Basel, Chelsea, Fiorentina and Roma before joining Liverpool in 2017, where he won the Champions League and the Premier League. His late penalty against Congo in October 2017 sent Egypt to its first World Cup in 28 years.',
    [['arab-contractors', 2010, 2012], ['FC Basel', 2012, 2014], ['Chelsea', 2014, 2016], ['Fiorentina', 2015, 2015], ['AS Roma', 2015, 2017], ['Liverpool', 2017, null]]],
  ['mohamed-elneny', 'Mohamed Elneny', 'محمد النني', null, '1992-07-11', null, 'El Mahalla El Kubra', 'MF', 'global', 0,
    'A tireless central midfielder who went from El Mokawloon to Basel and then spent more than eight seasons at Arsenal.',
    [['arab-contractors', 2010, 2013], ['FC Basel', 2013, 2016], ['Arsenal', 2016, 2024]]],
  ['omar-marmoush', 'Omar Marmoush', 'عمر مرموش', null, '1999-02-07', null, 'Cairo', 'FW', 'global', 0,
    'A forward who developed in Germany with Wolfsburg and broke out at Eintracht Frankfurt before joining Manchester City in January 2025.',
    [['Wadi Degla', 2016, 2017], ['VfL Wolfsburg', 2017, 2023], ['Eintracht Frankfurt', 2023, 2025], ['Manchester City', 2025, null]]],
];

const COMPETITIONS = [
  ['egyptian-premier-league', 'Egyptian Premier League', 'الدوري المصري الممتاز', 'domestic', 'league', 1948, 'The national league, first played in 1948–49.'],
  ['egypt-cup', 'Egypt Cup', 'كأس مصر', 'domestic', 'cup', 1921, 'The national knockout cup, first played in 1921–22.'],
  ['caf-champions-league', 'CAF Champions League', 'دوري أبطال أفريقيا', 'continental', 'tournament', 1964, 'Africa’s premier club competition, called the African Cup of Champions Clubs until 1996.'],
  ['caf-confederation-cup', 'CAF Confederation Cup', 'كأس الكونفدرالية الأفريقية', 'continental', 'tournament', 2004, 'Africa’s second-tier club competition.'],
  ['africa-cup-of-nations', 'Africa Cup of Nations', 'كأس الأمم الأفريقية', 'international', 'tournament', 1957, 'The continental championship for national teams. Egypt hold the record number of titles.'],
];

// [competition, season, winner club slug | null, winner team slug | null, runner_up, score, host]
const TITLES = [
  ...['1982', '1987', '2001', '2005', '2006', '2008', '2012', '2013', '2020', '2021', '2023', '2024'].map((s) => ['caf-champions-league', s, 'al-ahly']),
  ...['1984', '1986', '1993', '1996', '2002'].map((s) => ['caf-champions-league', s, 'zamalek']),
  ['caf-champions-league', '1969', 'ismaily'],
  ['caf-champions-league', '2025', 'pyramids', null, 'Mamelodi Sundowns'],
  ['caf-confederation-cup', '2014', 'al-ahly'],
  ['caf-confederation-cup', '2019', 'zamalek'],
  ['caf-confederation-cup', '2024', 'zamalek', null, 'RS Berkane'],
  ['egyptian-premier-league', '1948-49', 'al-ahly'],
  ['egyptian-premier-league', '1962-63', 'tersana'],
  ['egyptian-premier-league', '1965-66', 'olympic-club'],
  ['egyptian-premier-league', '1966-67', 'ismaily'],
  ['egyptian-premier-league', '1972-73', 'ghazl-el-mahalla'],
  ['egyptian-premier-league', '1982-83', 'arab-contractors'],
  ['egyptian-premier-league', '1990-91', 'ismaily'],
  ['egyptian-premier-league', '2001-02', 'ismaily'],
  ...['2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2022-23', '2023-24', '2024-25'].map((s) => ['egyptian-premier-league', s, 'al-ahly']),
  ...['2014-15', '2020-21', '2021-22'].map((s) => ['egyptian-premier-league', s, 'zamalek']),
  ['africa-cup-of-nations', '1957', null, 'egypt', 'Ethiopia', '4–0', 'Sudan'],
  ['africa-cup-of-nations', '1959', null, 'egypt', 'Sudan', '2–1 (final group match)', 'Egypt'],
  ['africa-cup-of-nations', '1986', null, 'egypt', 'Cameroon', '0–0 (5–4 pens)', 'Egypt'],
  ['africa-cup-of-nations', '1998', null, 'egypt', 'South Africa', '2–0', 'Burkina Faso'],
  ['africa-cup-of-nations', '2006', null, 'egypt', 'Ivory Coast', '0–0 (4–2 pens)', 'Egypt'],
  ['africa-cup-of-nations', '2008', null, 'egypt', 'Cameroon', '1–0', 'Ghana'],
  ['africa-cup-of-nations', '2010', null, 'egypt', 'Ghana', '1–0', 'Angola'],
];

const TEAMS = [
  ['egypt', 'Egypt', 'منتخب مصر', 'senior', 'The Pharaohs: the first African and Arab team to play at a World Cup, and record winners of the Africa Cup of Nations.'],
  ['egypt-olympic', 'Egypt Olympic', 'المنتخب الأولمبي', 'olympic', 'Fourth at the 1928 and 1964 Olympic football tournaments.'],
  ['egypt-u20', 'Egypt U-20', 'منتخب الشباب', 'u20', 'Third at the 2001 FIFA World Youth Championship in Argentina.'],
  ['egypt-women', 'Egypt Women', 'منتخب السيدات', 'women', 'Egypt’s women’s national team, Africa Women Cup of Nations participants.'],
];

// [team, tournament, year, host, result, coach, notes]
const APPEARANCES = [
  ['egypt', 'FIFA World Cup', 1934, 'Italy', 'First round', null, 'Lost 4–2 to Hungary in Naples; Abdelrahman Fawzi scored both goals.'],
  ['egypt', 'FIFA World Cup', 1990, 'Italy', 'Group stage', 'Mahmoud El-Gohary', 'Drew 1–1 with the Netherlands and 0–0 with Ireland, lost 1–0 to England.'],
  ['egypt', 'FIFA World Cup', 2018, 'Russia', 'Group stage', 'Héctor Cúper', 'Salah scored twice; El Hadary became the oldest player in World Cup history.'],
  ['egypt', 'FIFA World Cup', 2026, 'Canada, Mexico & USA', null, 'Hossam Hassan', 'Qualified in October 2025. Tournament results to be added by editors.'],
  ['egypt', 'Africa Cup of Nations', 1957, 'Sudan', 'Champions', null, 'El-Diba scored all four goals in the final.'],
  ['egypt', 'Africa Cup of Nations', 1959, 'Egypt', 'Champions', null, 'Played as the United Arab Republic.'],
  ['egypt', 'Africa Cup of Nations', 1986, 'Egypt', 'Champions', 'Mike Smith', 'Won the final on penalties in Cairo.'],
  ['egypt', 'Africa Cup of Nations', 1998, 'Burkina Faso', 'Champions', 'Mahmoud El-Gohary', null],
  ['egypt', 'Africa Cup of Nations', 2006, 'Egypt', 'Champions', 'Hassan Shehata', null],
  ['egypt', 'Africa Cup of Nations', 2008, 'Ghana', 'Champions', 'Hassan Shehata', null],
  ['egypt', 'Africa Cup of Nations', 2010, 'Angola', 'Champions', 'Hassan Shehata', 'Third title in a row; Gedo scored the winner in the final.'],
  ['egypt', 'Africa Cup of Nations', 2017, 'Gabon', 'Runners-up', 'Héctor Cúper', null],
  ['egypt', 'Africa Cup of Nations', 2021, 'Cameroon', 'Runners-up', 'Carlos Queiroz', 'Lost the final to Senegal on penalties.'],
  ['egypt-olympic', 'Olympic Games', 1928, 'Netherlands', 'Fourth place', null, null],
  ['egypt-olympic', 'Olympic Games', 1964, 'Japan', 'Fourth place', null, null],
  ['egypt-u20', 'FIFA World Youth Championship', 2001, 'Argentina', 'Third place', null, null],
];

// [date, title, body, club slug, player slug, featured]
const EVENTS = [
  ['1907-04-24', 'Al Ahly is founded in Cairo', null, 'al-ahly', null, 1],
  ['1911-01-05', 'Zamalek is founded as Qasr El Nil', null, 'zamalek', null, 0],
  ['1920-08-28', 'Egypt plays its first Olympic match, in Antwerp', null, null, null, 0],
  ['1921-12-03', 'The Egyptian Football Association is founded', null, null, null, 1],
  ['1928-08-01', 'Egypt finishes fourth at the Amsterdam Olympics', null, null, null, 0],
  ['1934-05-27', 'Egypt becomes the first African team at a World Cup', 'Lost 4–2 to Hungary in Naples.', null, 'abdelrahman-fawzi', 1],
  ['1948-10-22', 'The first Egyptian Premier League season kicks off', null, null, null, 0],
  ['1957-02-16', 'Egypt wins the first Africa Cup of Nations', 'Beat Ethiopia 4–0 in Khartoum. Egypt was a founding member of CAF the same year.', null, null, 1],
  ['1969-01-09', 'Ismaily become Egypt’s first champions of Africa', null, 'ismaily', null, 0],
  ['1983-12-31', 'Mahmoud El Khatib named African Footballer of the Year', null, null, 'mahmoud-el-khatib', 0],
  ['1986-03-21', 'Egypt wins the AFCON at home on penalties', null, null, null, 1],
  ['1990-06-12', 'Egypt holds the Netherlands 1–1 at Italia ’90', null, null, 'magdi-abdelghani', 0],
  ['2006-02-10', 'Egypt wins the AFCON in Cairo', null, null, 'mohamed-aboutrika', 0],
  ['2008-02-10', 'Aboutrika’s goal beats Cameroon in the AFCON final', null, null, 'mohamed-aboutrika', 0],
  ['2010-01-31', 'Three AFCON titles in a row under Hassan Shehata', null, null, 'hassan-shehata', 1],
  ['2012-02-01', 'The Port Said Stadium disaster', '72 Al Ahly supporters were killed after a match at Port Said. The league was suspended and stadiums closed to fans for years.', 'al-masry', null, 1],
  ['2017-10-08', 'Salah’s penalty sends Egypt to the 2018 World Cup', null, null, 'mohamed-salah', 1],
  ['2018-06-25', 'El Hadary becomes the oldest player in World Cup history', null, null, 'essam-el-hadary', 0],
  ['2025-10-08', 'Egypt qualifies for the 2026 World Cup', null, null, null, 1],
];

const SOURCES = [
  ['BBC Sport – Football', 'https://feeds.bbci.co.uk/sport/football/rss.xml', 'https://www.bbc.com/sport/football', 'en'],
  ['The Guardian – Football', 'https://www.theguardian.com/football/rss', 'https://www.theguardian.com/football', 'en'],
  ['ESPN – Soccer', 'https://www.espn.com/espn/rss/soccer/news', 'https://www.espn.com/soccer/', 'en'],
  ['Al Jazeera – Sport', 'https://www.aljazeera.com/xml/rss/all.xml', 'https://www.aljazeera.com/sports/', 'en'],
  ['BBC Arabic', 'https://feeds.bbci.co.uk/arabic/rss.xml', 'https://www.bbc.com/arabic', 'ar'],
];
const EN_TERMS = 'egypt,egyptian,pharaohs,salah,marmoush,al ahly,zamalek,pyramids fc,ismaily,hossam hassan,elneny,trezeguet';
const AR_TERMS = 'مصر,المصري,الفراعنة,صلاح,مرموش,الأهلي,الزمالك,بيراميدز,الإسماعيلي';

export function seed({ reset = false } = {}) {
  if (reset) {
    for (const t of ['audit_log', 'news', 'news_sources', 'events', 'tournament_appearances', 'titles', 'national_teams',
      'competitions', 'player_spells', 'players', 'club_milestones', 'clubs', 'eras', 'users']) run(`DELETE FROM ${t}`);
  }
  db.exec('BEGIN');
  try {
    for (const [slug, en, ar, s, e, sum] of ERAS) run('INSERT INTO eras (slug,name_en,name_ar,start_year,end_year,summary_en) VALUES (?,?,?,?,?,?)', slug, en, ar, s, e, sum);
    const eraId = (slug) => get('SELECT id FROM eras WHERE slug = ?', slug)?.id ?? null;

    for (const c of CLUBS) {
      const r = run('INSERT INTO clubs (slug,name_en,name_ar,nickname_en,city,founded_year,stadium,colors,history_en) VALUES (?,?,?,?,?,?,?,?,?)',
        c.slug, c.name_en, c.name_ar, c.nickname_en, c.city, c.founded_year, c.stadium, c.colors, c.history_en);
      for (const [y, k, t] of c.milestones) run('INSERT INTO club_milestones (club_id,year,kind,title_en) VALUES (?,?,?,?)', r.lastInsertRowid, y, k, t);
    }
    const clubId = (slug) => get('SELECT id FROM clubs WHERE slug = ?', slug)?.id ?? null;

    for (const [slug, en, ar, nick, b, d, place, pos, era, legend, bio, spells] of PLAYERS) {
      const r = run('INSERT INTO players (slug,name_en,name_ar,nickname,birth_date,death_date,birthplace,position,era_id,is_legend,bio_en) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        slug, en, ar, nick, b, d, place, pos, eraId(era), legend, bio);
      for (const [club, from, to] of spells) {
        const id = clubId(club);
        run('INSERT INTO player_spells (player_id,club_id,club_name,from_year,to_year) VALUES (?,?,?,?,?)', r.lastInsertRowid, id, id ? null : club, from, to);
      }
    }
    const playerId = (slug) => get('SELECT id FROM players WHERE slug = ?', slug)?.id ?? null;

    for (const [slug, en, ar, scope, kind, first, sum] of COMPETITIONS) run('INSERT INTO competitions (slug,name_en,name_ar,scope,kind,first_year,summary_en) VALUES (?,?,?,?,?,?,?)', slug, en, ar, scope, kind, first, sum);
    for (const [slug, en, ar, cat, sum] of TEAMS) run('INSERT INTO national_teams (slug,name_en,name_ar,category,summary_en) VALUES (?,?,?,?,?)', slug, en, ar, cat, sum);
    const compId = (slug) => get('SELECT id FROM competitions WHERE slug = ?', slug).id;
    const teamId = (slug) => (slug ? get('SELECT id FROM national_teams WHERE slug = ?', slug).id : null);

    for (const [comp, season, club, team, ru = null, score = null, host = null] of TITLES) {
      run('INSERT INTO titles (competition_id,season,winner_club_id,winner_team_id,runner_up,final_score,host) VALUES (?,?,?,?,?,?,?)',
        compId(comp), season, club ? clubId(club) : null, teamId(team), ru, score, host);
    }
    for (const [team, t, y, host, result, coach, notes] of APPEARANCES) {
      run('INSERT INTO tournament_appearances (team_id,tournament,year,host,result,coach,notes_en) VALUES (?,?,?,?,?,?,?)', teamId(team), t, y, host, result, coach, notes);
    }
    for (const [date, title, body, club, player, featured] of EVENTS) {
      run('INSERT INTO events (date,title_en,body_en,club_id,player_id,featured) VALUES (?,?,?,?,?,?)', date, title, body, club ? clubId(club) : null, player ? playerId(player) : null, featured);
    }
    for (const [name, url, site, lang] of SOURCES) {
      run('INSERT INTO news_sources (name,feed_url,site_url,language,filter_terms) VALUES (?,?,?,?,?)', name, url, site, lang, lang === 'ar' ? AR_TERMS : EN_TERMS);
    }

    const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || randomBytes(9).toString('base64url');
    const admin = run('INSERT INTO users (email,name,role,password_hash) VALUES (?,?,?,?)', email, 'Site Admin', 'admin', hashPassword(password));

    applyArabic();

    const now = Date.now();
    ARABIC_NEWS.forEach(([title, excerpt], i) => {
      run(`INSERT INTO news (guid_hash,title,excerpt,body,language,published_at,author_id,pinned) VALUES (?,?,?,?,?,?,?,?)`,
        `local-seed-${i}`, title, excerpt, excerpt, 'ar', new Date(now - i * 3600_000).toISOString(), admin.lastInsertRowid, i === 0 ? 1 : 0);
    });

    db.exec('COMMIT');
    if (!process.env.ADMIN_PASSWORD) console.log(`[seed] Admin account: ${email} / ${password}  (set ADMIN_PASSWORD to choose your own)`);
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed({ reset: process.argv.includes('--reset') });
  console.log('[seed] done');
}
