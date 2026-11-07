/* Cabinet Clash — politician deck.
   One politician per line:  Name|Country|Era|Fame|Skills|Role|Years|Wikipedia title (optional)
   Era:    h = before 1945, c = 1945–1999, m = 21st century
   Fame:   1 = household name, 2 = well known, 3 = deep cut
   Skills: seven digits, 1–9, one per seat in the order
           Leader, Economy, Foreign Affairs, Interior (police, borders), Justice (law, courts),
           Defence, Social Affairs (health, education, welfare).
           9 = defining career there, 6–7 = real experience, 4–5 = useful background, 2–3 = little.
           A rating of 7 or more counts as "real experience" (the fit shown with hints on). */
(function () {
  'use strict';

  const CONTINENTS = ['Europe', 'North America', 'South America', 'Asia', 'Africa', 'Oceania'];

  const COUNTRIES = {
    US: ['United States', 'North America'], CA: ['Canada', 'North America'], MX: ['Mexico', 'North America'],
    CU: ['Cuba', 'North America'], NI: ['Nicaragua', 'North America'], CR: ['Costa Rica', 'North America'],
    BR: ['Brazil', 'South America'], AR: ['Argentina', 'South America'], VE: ['Venezuela', 'South America'],
    CL: ['Chile', 'South America'], CO: ['Colombia', 'South America'], PE: ['Peru', 'South America'],
    UY: ['Uruguay', 'South America'], BO: ['Bolivia', 'South America'],
    GB: ['United Kingdom', 'Europe'], FR: ['France', 'Europe'], DE: ['Germany', 'Europe'], IT: ['Italy', 'Europe'],
    ES: ['Spain', 'Europe'], PT: ['Portugal', 'Europe'], IE: ['Ireland', 'Europe'], NL: ['Netherlands', 'Europe'],
    BE: ['Belgium', 'Europe'], AT: ['Austria', 'Europe'], SE: ['Sweden', 'Europe'], NO: ['Norway', 'Europe'],
    DK: ['Denmark', 'Europe'], FI: ['Finland', 'Europe'], EE: ['Estonia', 'Europe'], PL: ['Poland', 'Europe'],
    CZ: ['Czechia', 'Europe'], SK: ['Slovakia', 'Europe'], HU: ['Hungary', 'Europe'], GR: ['Greece', 'Europe'],
    RU: ['Russia', 'Europe'], UA: ['Ukraine', 'Europe'],
    TR: ['Turkey', 'Asia'], IL: ['Israel', 'Asia'], PS: ['Palestine', 'Asia'], JO: ['Jordan', 'Asia'],
    IR: ['Iran', 'Asia'], SA: ['Saudi Arabia', 'Asia'], IN: ['India', 'Asia'], PK: ['Pakistan', 'Asia'],
    BD: ['Bangladesh', 'Asia'], CN: ['China', 'Asia'], TW: ['Taiwan', 'Asia'], JP: ['Japan', 'Asia'],
    KR: ['South Korea', 'Asia'], SG: ['Singapore', 'Asia'], ID: ['Indonesia', 'Asia'], PH: ['Philippines', 'Asia'],
    VN: ['Vietnam', 'Asia'], MM: ['Myanmar', 'Asia'], MY: ['Malaysia', 'Asia'],
    LK: ['Sri Lanka', 'Asia'], TL: ['Timor-Leste', 'Asia'],
    EG: ['Egypt', 'Africa'], ZA: ['South Africa', 'Africa'], NG: ['Nigeria', 'Africa'], KE: ['Kenya', 'Africa'],
    GH: ['Ghana', 'Africa'], ET: ['Ethiopia', 'Africa'], TZ: ['Tanzania', 'Africa'], SN: ['Senegal', 'Africa'],
    BF: ['Burkina Faso', 'Africa'], CD: ['DR Congo', 'Africa'], LR: ['Liberia', 'Africa'], RW: ['Rwanda', 'Africa'],
    TN: ['Tunisia', 'Africa'],
    AU: ['Australia', 'Oceania'], NZ: ['New Zealand', 'Oceania'],
  };

  const RAW = `
George Washington|US|h|1|9566594|1st President of the United States|1732–1799
John Adams|US|h|3|6484744|2nd President of the United States|1735–1826
Thomas Jefferson|US|h|1|8585747|3rd US President, wrote the Declaration of Independence|1743–1826
Alexander Hamilton|US|h|2|5955763|First US Treasury Secretary|1755–1804
Benjamin Franklin|US|h|1|6694536|Founding Father and diplomat|1706–1790
Abraham Lincoln|US|h|1|9556885|16th President, led the Union through the Civil War|1809–1865
Ulysses S. Grant|US|h|2|6345393|18th US President and Union general|1822–1885
Theodore Roosevelt|US|h|1|9677586|26th President of the United States|1858–1919
Woodrow Wilson|US|h|2|7684555|28th US President, champion of the League of Nations|1856–1924
Franklin D. Roosevelt|US|h|1|9885589|32nd US President: New Deal and WWII|1882–1945
Eleanor Roosevelt|US|c|2|5483629|First Lady and UN human-rights diplomat|1884–1962
Harry S. Truman|US|c|2|7575476|33rd President of the United States|1884–1972
Dwight D. Eisenhower|US|c|1|8575495|34th US President and WWII Supreme Commander|1890–1969
John F. Kennedy|US|c|1|8575466|35th President of the United States|1917–1963
Robert F. Kennedy|US|c|2|5356836|US Attorney General|1925–1968
Lyndon B. Johnson|US|c|2|8645759|36th US President, signed the Civil Rights Act|1908–1973
Robert McNamara|US|c|3|4653384|US Secretary of Defense|1916–2009
Earl Warren|US|c|3|6336936|Governor of California and Chief Justice|1891–1974
Richard Nixon|US|c|1|8595365|37th President of the United States|1913–1994
Henry Kissinger|US|c|1|5493372|US Secretary of State|1923–2023
Jimmy Carter|US|c|2|6584456|39th US President, Nobel Peace laureate|1924–2024
Ronald Reagan|US|c|1|8775473|40th President of the United States|1911–2004
George H. W. Bush|US|c|2|7596484|41st US President, former CIA director|1924–2018
Madeleine Albright|US|c|3|4393454|First female US Secretary of State|1937–2022
Bill Clinton|US|c|1|8875657|42nd President of the United States|b. 1946
Al Gore|US|m|3|6563447|US Vice President and climate campaigner|b. 1948
George W. Bush|US|m|1|6556475|43rd President of the United States|b. 1946
Dick Cheney|US|m|2|5566382|US Vice President and Defense Secretary|1941–2025
Colin Powell|US|m|2|5385394|Secretary of State and four-star general|1937–2021
Condoleezza Rice|US|m|2|4385364|US Secretary of State|b. 1954
Hillary Clinton|US|m|1|6484757|US Secretary of State and First Lady|b. 1947
Barack Obama|US|m|1|8675758|44th President of the United States|b. 1961
Joe Biden|US|m|1|7585756|46th President of the United States|b. 1942
Donald Trump|US|m|1|6755253|45th and 47th President of the United States|b. 1946
Kamala Harris|US|m|2|5345835|US Vice President, ex-Attorney General of California|b. 1964
Mike Pence|US|m|3|5344434|US Vice President|b. 1959
JD Vance|US|m|2|5444544|US Vice President|b. 1984
Bernie Sanders|US|m|2|5633328|US Senator from Vermont|b. 1941
Nancy Pelosi|US|m|2|7554436|Speaker of the US House of Representatives|b. 1940
John McCain|US|m|2|5374383|US Senator and war veteran|1936–2018
John Kerry|US|m|3|5383554|US Secretary of State|b. 1943
Eric Holder|US|m|3|4336924|US Attorney General|b. 1951
Elizabeth Warren|US|m|3|4833627|US Senator from Massachusetts|b. 1949
Janet Yellen|US|m|3|3952324|US Treasury Secretary and Fed Chair|b. 1946
Alexandria Ocasio-Cortez|US|m|2|4533327|US Representative from New York|b. 1989
Marco Rubio|US|m|3|5374543|US Secretary of State|b. 1971
Gavin Newsom|US|m|3|7635426|Governor of California|b. 1967
Ron DeSantis|US|m|3|6536654|Governor of Florida|b. 1978
Elizabeth I|GB|h|1|9686474|Queen of England|1533–1603
Robert Peel|GB|h|3|7749635|Prime Minister who founded the modern police|1788–1850
Benjamin Disraeli|GB|h|2|8785456|Prime Minister of the UK|1804–1881
William Ewart Gladstone|GB|h|2|8965536|Four-time UK Prime Minister|1809–1898
David Lloyd George|GB|h|2|8864578|Prime Minister of the UK in WWI|1863–1945
Neville Chamberlain|GB|h|3|5744336|Prime Minister of the UK|1869–1940
Winston Churchill|GB|h|1|9576495|Prime Minister of the UK in WWII|1874–1965
Clement Attlee|GB|c|2|7654559|Prime Minister who built the welfare state|1883–1967
Harold Wilson|GB|c|3|6654336|Prime Minister of the UK|1916–1995
Margaret Thatcher|GB|c|1|9876575|First female Prime Minister of the UK|1925–2013
John Major|GB|c|3|6774344|Prime Minister of the UK|b. 1943
Tony Blair|GB|m|1|8675667|Prime Minister of the UK|b. 1953
Gordon Brown|GB|m|3|6953336|Prime Minister and Chancellor|b. 1951
Jack Straw|GB|m|3|4377834|Home Secretary and Foreign Secretary|b. 1946
David Cameron|GB|m|2|7574345|Prime Minister and Foreign Secretary|b. 1966
Theresa May|GB|m|2|6448544|Prime Minister and Home Secretary|b. 1956
Boris Johnson|GB|m|1|6464244|Prime Minister of the UK|b. 1964
Liz Truss|GB|m|3|3363533|Prime Minister of the UK|b. 1975
Rishi Sunak|GB|m|3|5843334|Prime Minister and Chancellor|b. 1980
Priti Patel|GB|m|3|4448433|UK Home Secretary 2019–2022|b. 1972
Keir Starmer|GB|m|2|6456945|Prime Minister, ex-Director of Public Prosecutions|b. 1962
Jeremy Corbyn|GB|m|3|4443327|Former Labour Party leader|b. 1949
Nigel Farage|GB|m|2|4444333|Brexit campaigner and Reform UK leader|b. 1964
Kemi Badenoch|GB|m|3|5644334|Conservative Party leader|b. 1980
Rachel Reeves|GB|m|3|4833325|First female Chancellor of the Exchequer|b. 1979
Cardinal Richelieu|FR|h|2|9698573|Chief minister of King Louis XIII|1585–1642
Maximilien Robespierre|FR|h|2|6338745|Leader of the French Revolution|1758–1794
Talleyrand|FR|h|3|5595433|Diplomat who served five French regimes|1754–1838|Charles Maurice de Talleyrand-Périgord
Napoleon Bonaparte|FR|h|1|9678997|Emperor of the French|1769–1821|Napoleon
Georges Clemenceau|FR|h|2|8478584|Prime Minister of France in WWI|1841–1929
Charles de Gaulle|FR|c|1|9686595|President of France, leader of Free France|1890–1970
Robert Schuman|FR|c|3|6594534|Founding father of the European Union|1886–1963
Jean Monnet|FR|c|3|5873334|Architect of European integration|1888–1979
Simone Veil|FR|c|2|5354829|Minister and President of the European Parliament|1927–2017
Valéry Giscard d'Estaing|FR|c|3|7874445|President of France|1926–2020
François Mitterrand|FR|c|2|8576666|President of France|1916–1996
Jacques Delors|FR|c|3|6973326|President of the European Commission|1925–2023
Jacques Chirac|FR|c|2|7575355|President of France|1932–2019
Nicolas Sarkozy|FR|m|2|7668654|President of France, ex-Interior Minister|b. 1955
François Hollande|FR|m|3|6554455|President of France|b. 1954
Dominique de Villepin|FR|m|3|6487443|Prime Minister, Foreign and Interior Minister|b. 1953
Manuel Valls|FR|m|3|6438543|Prime Minister and Interior Minister of France|b. 1962
Emmanuel Macron|FR|m|1|7874455|President of France|b. 1977
Christine Lagarde|FR|m|2|5973624|President of the European Central Bank|b. 1956
Marine Le Pen|FR|m|2|5446544|National Rally leader|b. 1968
Jordan Bardella|FR|m|3|4335333|President of the National Rally|b. 1995
Jean-Luc Mélenchon|FR|m|3|5543337|Leader of La France Insoumise|b. 1951
Gabriel Attal|FR|m|3|5433336|Youngest Prime Minister of France|b. 1989
Otto von Bismarck|DE|h|1|9797578|First Chancellor of the German Empire|1815–1898
Konrad Adenauer|DE|c|2|9785555|First Chancellor of West Germany|1876–1967
Ludwig Erhard|DE|c|3|6953325|Father of the German economic miracle|1897–1977
Willy Brandt|DE|c|2|8594446|Chancellor of West Germany, Nobel Peace laureate|1913–1992
Helmut Schmidt|DE|c|3|8876485|Chancellor of West Germany|1918–2015
Hans-Dietrich Genscher|DE|c|3|5495433|Long-serving West German Foreign Minister|1927–2016
Helmut Kohl|DE|c|2|9684455|Chancellor of German reunification|1930–2017
Gerhard Schröder|DE|m|3|7754546|Chancellor of Germany|b. 1944
Angela Merkel|DE|m|1|9785446|Chancellor of Germany for 16 years|b. 1954
Wolfgang Schäuble|DE|m|3|6858644|Finance and Interior Minister|1942–2023
Ursula von der Leyen|DE|m|2|7574367|President of the European Commission|b. 1958
Olaf Scholz|DE|m|2|6855546|Chancellor of Germany|b. 1958
Friedrich Merz|DE|m|2|6754643|Chancellor of Germany|b. 1955
Annalena Baerbock|DE|m|3|4373535|German Foreign Minister 2021–2025, UN General Assembly President|b. 1980
Boris Pistorius|DE|m|3|4347483|German Defence Minister|b. 1960
Nancy Faeser|DE|m|3|4337633|German Interior Minister 2021–2025|b. 1970
Alice Weidel|DE|m|3|4534333|Co-leader of the AfD|b. 1979
Julius Caesar|IT|h|1|9677696|Roman general and dictator|100–44 BC
Cicero|IT|h|2|6455935|Roman statesman, lawyer and orator|106–43 BC
Augustus|IT|h|2|9878777|First Roman emperor|63 BC–AD 14
Marcus Aurelius|IT|h|2|8565786|Roman emperor and Stoic philosopher|121–180
Niccolò Machiavelli|IT|h|1|5486463|Florentine diplomat who wrote The Prince|1469–1527
Camillo Cavour|IT|h|2|8894444|First Prime Minister of Italy|1810–1861|Camillo Benso, Count of Cavour
Giuseppe Garibaldi|IT|h|2|6245394|General of Italian unification|1807–1882
Alcide De Gasperi|IT|c|3|8684445|Prime Minister who rebuilt postwar Italy|1881–1954
Sandro Pertini|IT|c|3|6344556|President of Italy|1896–1990
Aldo Moro|IT|c|3|7484735|Prime Minister of Italy|1916–1978
Giulio Andreotti|IT|c|3|7576474|Seven-time Prime Minister of Italy|1919–2013
Enrico Berlinguer|IT|c|3|5443327|Leader of the Italian Communist Party|1922–1984
Bettino Craxi|IT|c|3|6564245|Prime Minister of Italy|1934–2000
Silvio Berlusconi|IT|m|1|6754233|Media tycoon and Prime Minister of Italy|1936–2023
Romano Prodi|IT|m|3|6873335|Prime Minister and EU Commission President|b. 1939
Mario Draghi|IT|m|2|7973334|Prime Minister and ECB President|b. 1947
Sergio Mattarella|IT|m|3|6344964|President of Italy, ex-constitutional judge|b. 1941
Matteo Renzi|IT|m|3|6543335|Prime Minister of Italy|b. 1975
Giuseppe Conte|IT|m|3|6454834|Prime Minister of Italy|b. 1964
Giorgia Meloni|IT|m|2|7566454|Prime Minister of Italy|b. 1977
Matteo Salvini|IT|m|2|5338433|Lega leader and ex-Interior Minister|b. 1973
Antonio Tajani|IT|m|3|4473433|Italian Foreign Minister|b. 1953
Elly Schlein|IT|m|3|4343427|Democratic Party leader|b. 1985
Adolfo Suárez|ES|c|3|8566655|Prime Minister of Spain's democratic transition|1932–2014
Felipe González|ES|c|3|8675657|Prime Minister of Spain|b. 1942
José María Aznar|ES|m|3|6766454|Prime Minister of Spain|b. 1953
José Luis Rodríguez Zapatero|ES|m|3|6454648|Prime Minister of Spain|b. 1960
Mariano Rajoy|ES|m|3|6656544|Prime Minister of Spain|b. 1955
Pedro Sánchez|ES|m|2|7665446|Prime Minister of Spain|b. 1972
Javier Solana|ES|m|3|5493375|NATO Secretary General and EU foreign policy chief|b. 1942
Alberto Núñez Feijóo|ES|m|3|5534335|People's Party leader|b. 1961
Santiago Abascal|ES|m|3|4336352|Vox party leader|b. 1976
Isabel Díaz Ayuso|ES|m|3|6634325|President of the Community of Madrid|b. 1978
Yolanda Díaz|ES|m|3|4633628|Spanish Labour Minister|b. 1971
Mário Soares|PT|c|3|7574645|President and Prime Minister of Portugal|1924–2017
José Manuel Barroso|PT|m|3|6683434|President of the European Commission|b. 1956
António Guterres|PT|m|2|7594438|UN Secretary-General|b. 1949
António Costa|PT|m|3|6664635|President of the European Council|b. 1961
Daniel O'Connell|IE|h|3|6344926|Champion of Catholic emancipation|1775–1847
Michael Collins|IE|h|2|6757393|Irish revolutionary leader|1890–1922|Michael Collins (Irish leader)
Éamon de Valera|IE|h|2|8475455|Taoiseach and President of Ireland|1882–1975
Mary Robinson|IE|c|3|6373827|First female President of Ireland|b. 1944
Leo Varadkar|IE|m|3|6554337|Taoiseach of Ireland|b. 1979
William the Silent|NL|h|3|8475484|Leader of the Dutch Revolt|1533–1584
Mark Rutte|NL|m|2|8684474|Dutch Prime Minister and NATO Secretary General|b. 1967
Frans Timmermans|NL|m|3|4483435|Dutch Foreign Minister and EU Commissioner|b. 1961
Geert Wilders|NL|m|3|4336332|Party for Freedom leader|b. 1963
Paul-Henri Spaak|BE|c|3|7493464|Belgian PM and NATO Secretary General|1899–1972
Guy Verhofstadt|BE|m|3|6663434|Prime Minister of Belgium|b. 1953
Herman Van Rompuy|BE|m|3|7773334|First President of the European Council|b. 1947
Charles Michel|BE|m|3|6473444|Belgian PM and European Council President|b. 1975
Maria Theresa|AT|h|2|9767768|Habsburg empress and reformer|1717–1780
Klemens von Metternich|AT|h|2|7398442|Architect of the Congress of Vienna|1773–1859
Bruno Kreisky|AT|c|3|8683437|Chancellor of Austria|1911–1990
Alexander Van der Bellen|AT|m|3|6653325|President of Austria|b. 1944
Sebastian Kurz|AT|m|3|6475333|Chancellor of Austria|b. 1986
Dag Hammarskjöld|SE|c|2|6693444|UN Secretary-General|1905–1961
Olof Palme|SE|c|2|8584438|Prime Minister of Sweden|1927–1986
Carl Bildt|SE|m|3|6583343|Swedish PM and Foreign Minister|b. 1949
Magdalena Andersson|SE|m|3|6853335|Prime Minister and Finance Minister of Sweden|b. 1967
Ulf Kristersson|SE|m|3|5545445|Prime Minister of Sweden|b. 1963
Gro Harlem Brundtland|NO|c|3|7573329|Prime Minister of Norway|b. 1939
Jens Stoltenberg|NO|m|2|7884385|NATO Secretary General and Norwegian PM|b. 1959
Anders Fogh Rasmussen|DK|m|3|7674374|Danish PM and NATO Secretary General|b. 1953
Margrethe Vestager|DK|m|3|5853625|EU Competition Commissioner|b. 1968
Mette Frederiksen|DK|m|3|7456556|Prime Minister of Denmark|b. 1977
Carl Gustaf Emil Mannerheim|FI|h|3|7355396|Marshal and President of Finland|1867–1951
Urho Kekkonen|FI|c|3|8486644|President of Finland|1900–1986
Sauli Niinistö|FI|m|3|7764544|President of Finland|b. 1948
Sanna Marin|FI|m|3|6443336|Prime Minister of Finland|b. 1985
Alexander Stubb|FI|m|3|6583443|President of Finland|b. 1968
Kaja Kallas|EE|m|3|6574563|Estonian PM and EU foreign policy chief|b. 1977
Józef Piłsudski|PL|h|2|8366393|Founder of the Second Polish Republic|1867–1935
Lech Wałęsa|PL|c|2|6353236|Solidarity leader and President of Poland|b. 1943
Tadeusz Mazowiecki|PL|c|3|7453435|First non-communist PM of Poland|1927–2013
Donald Tusk|PL|m|2|8684454|Polish PM and European Council President|b. 1957
Jarosław Kaczyński|PL|m|3|6336545|Law and Justice party leader|b. 1949
Andrzej Duda|PL|m|3|5353643|President of Poland|b. 1972
Radosław Sikorski|PL|m|3|5383383|Polish Foreign and Defence Minister|b. 1963
Karol Nawrocki|PL|m|3|4344345|President of Poland|b. 1983
Charles IV|CZ|h|2|9786758|King of Bohemia and Holy Roman Emperor|1316–1378|Charles IV, Holy Roman Emperor
Jan Žižka|CZ|h|3|5224292|Undefeated Hussite general|c. 1360–1424
Tomáš Garrigue Masaryk|CZ|h|2|9485557|Founder and first President of Czechoslovakia|1850–1937
Edvard Beneš|CZ|h|3|6494444|President of Czechoslovakia|1884–1948
Jan Masaryk|CZ|c|3|5383334|Czechoslovak Foreign Minister|1886–1948
Milada Horáková|CZ|c|3|4344827|Lawyer and politician|1901–1950
Ludvík Svoboda|CZ|c|3|6245394|General and President of Czechoslovakia|1895–1979
Václav Havel|CZ|c|2|8373537|Playwright, dissident and President|1936–2011
Václav Klaus|CZ|m|3|7953333|Czech President and Prime Minister|b. 1941
Miloš Zeman|CZ|m|3|6554334|Czech President and Prime Minister|b. 1944
Mirek Topolánek|CZ|m|3|5543333|Czech Prime Minister|b. 1956
Bohuslav Sobotka|CZ|m|3|6743435|Czech Prime Minister|b. 1971
Karel Schwarzenberg|CZ|m|3|5383333|Czech Foreign Minister|1937–2023
Andrej Babiš|CZ|m|3|6834234|Czech Prime Minister and billionaire|b. 1954
Petr Fiala|CZ|m|3|6454446|Czech Prime Minister 2021–2025|b. 1964
Petr Pavel|CZ|m|3|7375393|Czech President, ex-NATO general|b. 1961
Tomio Okamura|CZ|m|3|4435333|SPD leader and Speaker of the Czech Chamber of Deputies|b. 1972
Vít Rakušan|CZ|m|3|5338443|Czech Interior Minister 2021–2025, STAN leader|b. 1978
Jan Lipavský|CZ|m|3|4373343|Czech Foreign Minister 2021–2025|b. 1985
Milan Rastislav Štefánik|SK|h|3|5383285|General, astronomer and co-founder of Czechoslovakia|1880–1919
Alexander Dubček|SK|c|2|7353426|Leader of the Prague Spring|1921–1992
Vladimír Mečiar|SK|c|3|6436333|Prime Minister of Slovakia|b. 1942
Mikuláš Dzurinda|SK|m|3|7773334|Prime Minister of Slovakia|b. 1955
Ivan Gašparovič|SK|m|3|5334633|President of Slovakia|b. 1941
Iveta Radičová|SK|m|3|6443337|First female Prime Minister of Slovakia|b. 1956
Robert Fico|SK|m|3|6555535|Prime Minister of Slovakia|b. 1964
Miroslav Lajčák|SK|m|3|4383333|Slovak Foreign Minister and UN General Assembly President|b. 1963
Zuzana Čaputová|SK|m|3|6353826|First female President of Slovakia|b. 1973
Peter Pellegrini|SK|m|3|5543334|President of Slovakia|b. 1975
Igor Matovič|SK|m|3|4433324|Prime Minister of Slovakia|b. 1973
Michal Šimečka|SK|m|3|4353325|Progressive Slovakia leader|b. 1984
Lajos Kossuth|HU|h|3|7664444|Leader of the 1848 Hungarian revolution|1802–1894
Imre Nagy|HU|c|3|6545335|Prime Minister during the 1956 revolution|1896–1958
Viktor Orbán|HU|m|2|8567444|Prime Minister of Hungary|b. 1963
Katalin Novák|HU|m|3|5353327|President of Hungary|b. 1977
Péter Magyar|HU|m|3|5453524|Leader of the Tisza party|b. 1981
Solon|GR|h|3|7745937|Athenian lawgiver|c. 630–560 BC
Pericles|GR|h|2|9675587|Statesman of Athens' golden age|c. 495–429 BC
Eleftherios Venizelos|GR|h|3|8585565|Prime Minister of Greece|1864–1936
Andreas Papandreou|GR|c|3|7654337|Prime Minister of Greece|1919–1996
Alexis Tsipras|GR|m|3|5453336|Prime Minister of Greece|b. 1974
Yanis Varoufakis|GR|m|3|4842325|Greek Finance Minister in the 2015 debt crisis|b. 1961
Kyriakos Mitsotakis|GR|m|3|7764444|Prime Minister of Greece|b. 1968
Peter the Great|RU|h|1|9777596|Tsar who modernised Russia|1672–1725
Catherine the Great|RU|h|1|9686777|Empress of Russia|1729–1796
Alexander Kerensky|RU|h|3|5345754|Head of Russia's Provisional Government|1881–1970
Andrei Gromyko|RU|c|3|5393342|Soviet Foreign Minister for 28 years|1909–1989
Nikita Khrushchev|RU|c|2|7565365|Soviet leader|1894–1971
Mikhail Gorbachev|RU|c|1|7484545|Last leader of the Soviet Union|1931–2022
Boris Yeltsin|RU|c|2|6454353|First President of Russia|1931–2007
Vladimir Putin|RU|m|1|8569373|President of Russia|b. 1952
Dmitry Medvedev|RU|m|3|5454644|President and Prime Minister of Russia|b. 1965
Sergey Lavrov|RU|m|2|4393342|Russian Foreign Minister|b. 1950
Alexei Navalny|RU|m|2|5334724|Opposition leader and anti-corruption activist|1976–2024
Volodymyr Zelenskyy|UA|m|1|7375374|President of Ukraine|b. 1978
Yulia Tymoshenko|UA|m|3|6743435|Prime Minister of Ukraine|b. 1960
Petro Poroshenko|UA|m|3|6774363|President of Ukraine|b. 1965
Vitali Klitschko|UA|m|3|4345345|Mayor of Kyiv and boxing champion|b. 1971
Dmytro Kuleba|UA|m|3|4383343|Ukrainian Foreign Minister 2020–2024|b. 1981
Suleiman the Magnificent|TR|h|2|9677996|Ottoman sultan known as the Lawgiver|1494–1566
Mustafa Kemal Atatürk|TR|h|1|9577798|Founder of the Republic of Turkey|1881–1938
Recep Tayyip Erdoğan|TR|m|2|8678465|President of Turkey|b. 1954
Ekrem İmamoğlu|TR|m|3|6534326|Mayor of Istanbul|b. 1970
David Ben-Gurion|IL|c|2|9566496|Founding Prime Minister of Israel|1886–1973
Golda Meir|IL|c|2|8485467|Prime Minister of Israel|1898–1978
Menachem Begin|IL|c|3|7465655|Prime Minister, Nobel Peace laureate|1913–1992
Moshe Dayan|IL|c|3|5375393|Defence and Foreign Minister of Israel|1915–1981
Yitzhak Rabin|IL|c|2|8475394|Prime Minister, Nobel Peace laureate|1922–1995
Shimon Peres|IL|c|3|7684375|President and Prime Minister of Israel|1923–2016
Benjamin Netanyahu|IL|m|1|8776473|Longest-serving Prime Minister of Israel|b. 1949
Yasser Arafat|PS|c|2|7365264|PLO chairman, Nobel Peace laureate|1929–2004
Mahmoud Abbas|PS|m|3|5364333|President of the Palestinian Authority|b. 1935
King Hussein|JO|c|3|8486475|King of Jordan|1935–1999|Hussein of Jordan
Cyrus the Great|IR|h|2|9686797|Founder of the Persian Empire|c. 600–530 BC
Mohammad Mosaddegh|IR|c|3|7754635|Prime Minister who nationalised Iran's oil|1882–1967
Hassan Rouhani|IR|m|3|6576554|President of Iran|b. 1948
Mohammad Javad Zarif|IR|m|3|4393333|Iranian Foreign Minister|b. 1960
Masoud Pezeshkian|IR|m|3|5454337|President of Iran|b. 1954
Ibn Saud|SA|h|3|8467493|Founder of Saudi Arabia|1875–1953
King Faisal|SA|c|3|8695546|King of Saudi Arabia|1906–1975|Faisal of Saudi Arabia
Mohammed bin Salman|SA|m|2|7768364|Crown Prince and Prime Minister of Saudi Arabia|b. 1985
Ashoka|IN|h|2|9566788|Mauryan emperor|c. 304–232 BC
Mahatma Gandhi|IN|h|1|8563718|Leader of India's independence movement|1869–1948
Subhas Chandra Bose|IN|h|3|6364384|Independence leader|1897–1945
Jawaharlal Nehru|IN|c|1|9685647|First Prime Minister of India|1889–1964
Vallabhbhai Patel|IN|c|2|7449754|First Home Minister of India|1875–1950
B. R. Ambedkar|IN|c|2|6644929|Architect of India's constitution|1891–1956
Indira Gandhi|IN|c|1|8677376|Prime Minister of India|1917–1984
Rajiv Gandhi|IN|c|3|6564345|Prime Minister of India|1944–1991
Atal Bihari Vajpayee|IN|m|3|8584465|Prime Minister of India|1924–2018
Manmohan Singh|IN|m|2|6963335|Prime Minister and reformist Finance Minister|1932–2024
Narendra Modi|IN|m|1|8677365|Prime Minister of India|b. 1950
Amit Shah|IN|m|3|5338543|Indian Home Minister|b. 1964
S. Jaishankar|IN|m|3|4493343|Indian External Affairs Minister|b. 1955
Nirmala Sitharaman|IN|m|3|4853364|Indian Finance and Defence Minister|b. 1959
Rahul Gandhi|IN|m|3|4443325|Leader of the Opposition in India|b. 1970
Arvind Kejriwal|IN|m|3|6434428|Chief Minister of Delhi|b. 1968
Muhammad Ali Jinnah|PK|c|2|8465944|Founder of Pakistan|1876–1948
Zulfikar Ali Bhutto|PK|c|3|7595655|President and Prime Minister of Pakistan|1928–1979
Benazir Bhutto|PK|c|2|7474446|First female Prime Minister of Pakistan|1953–2007
Nawaz Sharif|PK|m|3|6654344|Three-time Prime Minister of Pakistan|b. 1949
Imran Khan|PK|m|2|5454336|Prime Minister and cricket legend|b. 1952
Shehbaz Sharif|PK|m|3|6555345|Prime Minister of Pakistan|b. 1951
Sheikh Mujibur Rahman|BD|c|3|8465455|Founding father of Bangladesh|1920–1975
Sheikh Hasina|BD|m|3|7666346|Prime Minister of Bangladesh|b. 1947
Muhammad Yunus|BD|m|3|5863329|Microfinance pioneer and Chief Adviser|b. 1940
Confucius|CN|h|1|6555829|Philosopher and minister of Lu|551–479 BC
Qin Shi Huang|CN|h|2|9659794|First emperor of a unified China|259–210 BC
Sun Yat-sen|CN|h|2|7574457|Founding father of the Republic of China|1866–1925
Zhou Enlai|CN|c|2|8695455|First Premier of the People's Republic of China|1898–1976
Deng Xiaoping|CN|c|1|9976475|Architect of China's economic reforms|1904–1997
Jiang Zemin|CN|c|3|7765354|Paramount leader of China|1926–2022
Zhu Rongji|CN|c|3|6954435|Premier of China and economic reformer|b. 1928
Hu Jintao|CN|m|3|6666355|President of China|b. 1942
Xi Jinping|CN|m|1|8679475|President of China|b. 1953
Li Keqiang|CN|m|3|6854535|Premier of China|1955–2023
Li Qiang|CN|m|3|5744334|Premier of China|b. 1959
Wang Yi|CN|m|3|4393342|Chinese Foreign Minister|b. 1953
Chiang Kai-shek|TW|c|2|7467384|Leader of the Republic of China|1887–1975
Tsai Ing-wen|TW|m|3|6664755|First female President of Taiwan|b. 1956
Lai Ching-te|TW|m|3|6454347|President of Taiwan|b. 1959
Itō Hirobumi|JP|h|3|8685845|First Prime Minister of Japan|1841–1909
Shigeru Yoshida|JP|c|3|8784435|Prime Minister of postwar Japan|1878–1967
Kakuei Tanaka|JP|c|3|6864235|Prime Minister of Japan|1918–1993
Yasuhiro Nakasone|JP|c|3|7674374|Prime Minister of Japan|1918–2019
Junichiro Koizumi|JP|m|3|7754345|Prime Minister of Japan|b. 1942
Shinzo Abe|JP|m|2|8775464|Longest-serving Prime Minister of Japan|1954–2022
Fumio Kishida|JP|m|3|6583344|Prime Minister and Foreign Minister of Japan|b. 1957
Shigeru Ishiba|JP|m|3|5454384|Prime Minister and ex-Defence Minister|b. 1957
Sanae Takaichi|JP|m|3|6547454|First female Prime Minister of Japan|b. 1961
Kim Dae-jung|KR|c|3|8674547|President, Nobel Peace laureate|1924–2009
Ban Ki-moon|KR|m|2|5393335|UN Secretary-General|b. 1944
Moon Jae-in|KR|m|3|6464745|President of South Korea|b. 1953
Yoon Suk Yeol|KR|m|3|5456843|President of South Korea, ex-prosecutor|b. 1960
Lee Jae-myung|KR|m|3|6544737|President of South Korea|b. 1963
Lee Kuan Yew|SG|c|2|9988778|Founding Prime Minister of Singapore|1923–2015
Lee Hsien Loong|SG|m|3|8875476|Prime Minister of Singapore|b. 1952
Lawrence Wong|SG|m|3|6754336|Prime Minister of Singapore|b. 1972
Sukarno|ID|c|2|8375355|First President of Indonesia|1901–1970
Joko Widodo|ID|m|3|6654336|President of Indonesia|b. 1961
Prabowo Subianto|ID|m|3|6456384|President of Indonesia, ex-general|b. 1951
José Rizal|PH|h|3|5353428|National hero of the Philippines|1861–1896
Corazon Aquino|PH|c|3|7454635|First female President of the Philippines|1933–2009
Bongbong Marcos|PH|m|3|5454334|President of the Philippines|b. 1957
Ho Chi Minh|VN|c|1|9486385|Founding leader of modern Vietnam|1890–1969
Võ Nguyên Giáp|VN|c|3|5345293|Vietnamese general|1911–2013
John Curtin|AU|h|3|8564386|Prime Minister of Australia in WWII|1885–1945
Robert Menzies|AU|c|3|8664656|Longest-serving Prime Minister of Australia|1894–1978
Bob Hawke|AU|c|3|8763437|Prime Minister of Australia|1929–2019
Paul Keating|AU|c|3|7963336|Prime Minister and Treasurer|b. 1944
John Howard|AU|m|3|7766554|Prime Minister of Australia|b. 1939
Kevin Rudd|AU|m|3|6583346|Prime Minister of Australia|b. 1957
Julia Gillard|AU|m|3|6443637|First female Prime Minister of Australia|b. 1961
Malcolm Turnbull|AU|m|3|6654644|Prime Minister of Australia|b. 1954
Scott Morrison|AU|m|3|5656344|Prime Minister of Australia|b. 1968
Anthony Albanese|AU|m|3|6454336|Prime Minister of Australia|b. 1963
Penny Wong|AU|m|3|4583534|Australian Foreign Minister|b. 1968
Richard Seddon|NZ|h|3|8544338|Longest-serving PM of New Zealand|1845–1906
David Lange|NZ|c|3|6574646|Prime Minister of New Zealand|1942–2005
Helen Clark|NZ|m|3|8674357|Prime Minister of New Zealand|b. 1950
Jacinda Ardern|NZ|m|2|7465338|Prime Minister of New Zealand|b. 1980
Christopher Luxon|NZ|m|3|5643334|Prime Minister of New Zealand|b. 1970
John A. Macdonald|CA|h|3|8655754|First Prime Minister of Canada|1815–1891
Wilfrid Laurier|CA|h|3|8564645|Prime Minister of Canada|1841–1919
Lester B. Pearson|CA|c|3|7493357|PM and Nobel Peace laureate|1897–1972
Pierre Trudeau|CA|c|2|8566846|Prime Minister of Canada|1919–2000
Brian Mulroney|CA|c|3|7774544|Prime Minister of Canada|1939–2024
Jean Chrétien|CA|c|3|7654735|Prime Minister of Canada|b. 1934
Stephen Harper|CA|m|3|6755453|Prime Minister of Canada|b. 1959
Justin Trudeau|CA|m|1|6464436|Prime Minister of Canada|b. 1971
Chrystia Freeland|CA|m|3|5783334|Deputy PM, Finance and Foreign Minister|b. 1968
Mark Carney|CA|m|2|6973334|Prime Minister of Canada, ex-central banker|b. 1965
Pierre Poilievre|CA|m|3|4534333|Conservative Party leader|b. 1979
Benito Juárez|MX|h|2|8465956|President of Mexico and liberal reformer|1806–1872
Emiliano Zapata|MX|h|2|5324387|Revolutionary leader|1879–1919
Pancho Villa|MX|h|3|4234284|Revolutionary general|1878–1923
Lázaro Cárdenas|MX|h|3|8865468|President who nationalised Mexican oil|1895–1970
Vicente Fox|MX|m|3|5653335|President of Mexico|b. 1942
Felipe Calderón|MX|m|3|6558554|President of Mexico|b. 1962
Andrés Manuel López Obrador|MX|m|2|7545347|President of Mexico|b. 1953
Claudia Sheinbaum|MX|m|2|7556436|First female President of Mexico|b. 1962
Marcelo Ebrard|MX|m|3|5786434|Mexican Foreign and Economy Minister|b. 1959
José Martí|CU|h|3|5363447|Cuban national hero and writer|1853–1895
Fidel Castro|CU|c|1|8378587|Leader of Cuba|1926–2016
Pedro II|BR|h|3|8564548|Emperor of Brazil|1825–1891|Pedro II of Brazil
Getúlio Vargas|BR|h|3|8757458|President of Brazil|1882–1954
Juscelino Kubitschek|BR|c|3|7854336|President who built Brasília|1902–1976
Fernando Henrique Cardoso|BR|c|3|7974436|President of Brazil|b. 1931
Lula da Silva|BR|m|1|8674339|President of Brazil|b. 1945|Luiz Inácio Lula da Silva
Dilma Rousseff|BR|m|3|5654336|First female President of Brazil|b. 1947
Jair Bolsonaro|BR|m|2|5446272|President of Brazil|b. 1955
Marina Silva|BR|m|3|4353328|Brazilian Environment Minister|b. 1958
Fernando Haddad|BR|m|3|5743427|Brazilian Finance Minister|b. 1963
José de San Martín|AR|h|2|7365394|Liberator of Argentina, Chile and Peru|1778–1850
Juan Perón|AR|c|2|8666478|Three-time President of Argentina|1895–1974
Eva Perón|AR|c|2|6453329|First Lady and political icon|1919–1952
Raúl Alfonsín|AR|c|3|7464846|President who restored Argentine democracy|1927–2009
Néstor Kirchner|AR|m|3|6754536|President of Argentina|1950–2010
Cristina Fernández de Kirchner|AR|m|3|6554636|President of Argentina|b. 1953
Mauricio Macri|AR|m|3|5654334|President of Argentina|b. 1959
Javier Milei|AR|m|2|5744332|President of Argentina|b. 1970
Simón Bolívar|VE|h|1|9475695|Liberator of South America|1783–1830
Hugo Chávez|VE|m|2|6466367|President of Venezuela|1954–2013
María Corina Machado|VE|m|3|5563434|Opposition leader, Nobel Peace laureate|b. 1967
Bernardo O'Higgins|CL|h|3|7455485|Liberator of Chile|1778–1842
Salvador Allende|CL|c|2|6553439|President of Chile|1908–1973
Michelle Bachelet|CL|m|3|7464379|President of Chile, ex-Defence Minister|b. 1951
Sebastián Piñera|CL|m|3|6854444|President of Chile|1949–2024
Gabriel Boric|CL|m|3|5443427|President of Chile|b. 1986
Francisco de Paula Santander|CO|h|3|7555866|Founding President of Colombia|1792–1840
Álvaro Uribe|CO|m|3|6558383|President of Colombia|b. 1952
Juan Manuel Santos|CO|m|3|7784485|President of Colombia, Nobel Peace laureate|b. 1951
Gustavo Petro|CO|m|3|5444337|President of Colombia|b. 1960
Javier Pérez de Cuéllar|PE|c|3|5393434|UN Secretary-General|1920–2020
José Mujica|UY|m|2|7454338|President of Uruguay|1935–2025
Evo Morales|BO|m|3|6554337|President of Bolivia|b. 1959
Nelson Mandela|ZA|c|1|9485847|First President of democratic South Africa|1918–2013
Oliver Tambo|ZA|c|3|6383645|ANC leader in exile|1917–1993
F. W. de Klerk|ZA|c|3|7565544|President who ended apartheid|1936–2021
Thabo Mbeki|ZA|m|3|7684334|President of South Africa|b. 1942
Jacob Zuma|ZA|m|3|5356244|President of South Africa|b. 1942
Cyril Ramaphosa|ZA|m|3|7864535|President of South Africa|b. 1952
Julius Malema|ZA|m|3|4434326|Economic Freedom Fighters leader|b. 1981
Nnamdi Azikiwe|NG|c|3|7463437|First President of Nigeria|1904–1996
Olusegun Obasanjo|NG|m|3|7575384|President of Nigeria|b. 1937
Muhammadu Buhari|NG|m|3|5346573|President of Nigeria|1942–2025
Goodluck Jonathan|NG|m|3|5454335|President of Nigeria|b. 1957
Bola Tinubu|NG|m|3|6744334|President of Nigeria|b. 1952
Ngozi Okonjo-Iweala|NG|m|3|5983326|WTO Director-General|b. 1954
Jomo Kenyatta|KE|c|3|8565455|First President of Kenya|1897–1978
Wangari Maathai|KE|m|3|5353328|Environmentalist and Nobel Peace laureate|1940–2011
Raila Odinga|KE|m|3|6544335|Prime Minister of Kenya|1945–2025
Uhuru Kenyatta|KE|m|3|6654335|President of Kenya|b. 1961
William Ruto|KE|m|3|6655334|President of Kenya|b. 1966
Kwame Nkrumah|GH|c|2|8585348|First President of Ghana|1909–1972
Jerry Rawlings|GH|c|3|6456384|President of Ghana|1947–2020
Kofi Annan|GH|m|2|6493437|UN Secretary-General|1938–2018
John Mahama|GH|m|3|6554335|President of Ghana|b. 1958
Haile Selassie|ET|c|2|8486565|Emperor of Ethiopia|1892–1975
Abiy Ahmed|ET|m|3|6576374|Prime Minister, Nobel Peace laureate|b. 1976
Julius Nyerere|TZ|c|3|8474449|Founding President of Tanzania|1922–1999
Samia Suluhu Hassan|TZ|m|3|6554336|President of Tanzania|b. 1960
Léopold Sédar Senghor|SN|c|3|7473438|Poet and first President of Senegal|1906–2001
Thomas Sankara|BF|c|3|7565379|President of Burkina Faso|1949–1987
Patrice Lumumba|CD|c|2|6364335|First Prime Minister of Congo|1925–1961
Ellen Johnson Sirleaf|LR|m|3|7874437|Africa's first elected female head of state|b. 1938
Paul Kagame|RW|m|3|8768396|President of Rwanda|b. 1957
Habib Bourguiba|TN|c|3|8475648|First President of Tunisia|1903–2000
Cleopatra|EG|h|1|9795465|Last ruler of Ptolemaic Egypt|69–30 BC
Gamal Abdel Nasser|EG|c|2|8687377|President of Egypt|1918–1970
Anwar Sadat|EG|c|2|8595374|President of Egypt, Nobel Peace laureate|1918–1981
Hosni Mubarak|EG|c|3|6467383|President of Egypt|1928–2020
Boutros Boutros-Ghali|EG|c|3|5393734|UN Secretary-General|1922–2016
Abdel Fattah el-Sisi|EG|m|3|6558383|President of Egypt|b. 1954
James Madison|US|h|2|7685955|4th US President, constitutional architect and Secretary of State|1751–1836
Ruth Bader Ginsburg|US|m|2|4343927|US Supreme Court justice and advocate for women's legal equality|1933–2020
Martin Luther King Jr.|US|c|1|7363729|Civil rights leader and Nobel Peace laureate|1929–1968
Louis XIV|FR|h|1|9677684|King of France, known as the Sun King|1638–1715
Vladimir Lenin|RU|h|1|8568666|Bolshevik leader and first head of the Soviet government|1870–1924
Che Guevara|CU|c|1|5654286|Cuban revolutionary, guerrilla commander and Minister of Industries|1928–1967
Desmond Tutu|ZA|c|2|6373828|Archbishop and chair of South Africa's Truth and Reconciliation Commission|1931–2021
Gough Whitlam|AU|c|2|7574759|Prime Minister of Australia who introduced universal health care|1916–2014
Aung San Suu Kyi|MM|m|2|6474526|State Counsellor and Foreign Minister of Myanmar|b. 1945
Mahathir Mohamad|MY|c|2|8878477|Malaysian Prime Minister, former Finance, Home and Education Minister|b. 1925
Sirimavo Bandaranaike|LK|c|2|7575477|World's first female Prime Minister, Sri Lankan Defence and External Affairs Minister|1916–2000
José Ramos-Horta|TL|m|2|7594466|President, Prime Minister and Foreign Minister of Timor-Leste|b. 1949
Violeta Chamorro|NI|c|2|7674565|First female President of Nicaragua|1929–2025
Óscar Arias|CR|c|2|7794536|President of Costa Rica and Nobel Peace laureate for Central American peace efforts|b. 1940|Óscar Arias
`;

  const SEAT_ORDER = 'LEFIJDS';
  const POLS = RAW.trim().split('\n').map((line, i) => {
    const [n, c, e, t, skills, r, y, w] = line.split('|');
    const sk = {};
    [...SEAT_ORDER].forEach((k, j) => (sk[k] = +skills[j]));
    const tags = [...SEAT_ORDER].filter((k) => sk[k] >= 7).join('');
    return { i, n, c, e, t: +t, sk, tags, r, y, w: w || n };
  });

  // Neutral descriptions, shown while Experience hints are off: these roles would give away the seat fit.
  const NEUTRAL = {
    "James Madison": "4th President of the United States",
    "Ruth Bader Ginsburg": "American public figure known as RBG",
    "Martin Luther King Jr.": "American public figure and Nobel laureate",
    "Che Guevara": "Cuban revolutionary and political figure",
    "Desmond Tutu": "South African archbishop and Nobel laureate",
    "Gough Whitlam": "Prime Minister of Australia",
    "Aung San Suu Kyi": "State Counsellor of Myanmar",
    "Mahathir Mohamad": "Prime Minister of Malaysia",
    "Sirimavo Bandaranaike": "World's first female Prime Minister",
    "José Ramos-Horta": "President and Prime Minister of Timor-Leste",
    "Óscar Arias": "President of Costa Rica and Nobel laureate",
    "Alexander Hamilton": "Founding Father of the United States",
    "Benjamin Franklin": "Founding Father of the United States",
    "Ulysses S. Grant": "18th President of the United States",
    "Woodrow Wilson": "28th President of the United States",
    "Eleanor Roosevelt": "First Lady of the United States",
    "Dwight D. Eisenhower": "34th President of the United States",
    "Robert F. Kennedy": "US politician and senator",
    "Robert McNamara": "US cabinet member",
    "Earl Warren": "Governor of California",
    "Henry Kissinger": "US cabinet member and statesman",
    "Madeleine Albright": "US cabinet member",
    "Dick Cheney": "US Vice President",
    "Colin Powell": "US cabinet member",
    "Condoleezza Rice": "US cabinet member",
    "Hillary Clinton": "US cabinet member and First Lady",
    "Kamala Harris": "US Vice President",
    "John McCain": "US Senator from Arizona",
    "John Kerry": "US cabinet member and senator",
    "Eric Holder": "US cabinet member",
    "Janet Yellen": "US cabinet member",
    "Marco Rubio": "US cabinet member and senator",
    "Robert Peel": "Prime Minister of the UK",
    "Clement Attlee": "Prime Minister of the UK after WWII",
    "Gordon Brown": "Prime Minister of the UK",
    "Jack Straw": "UK cabinet minister",
    "David Cameron": "Prime Minister of the UK",
    "Theresa May": "Prime Minister of the UK",
    "Priti Patel": "UK cabinet minister",
    "Keir Starmer": "Prime Minister of the UK",
    "Rishi Sunak": "Prime Minister of the UK",
    "Rachel Reeves": "UK cabinet minister",
    "Talleyrand": "Statesman who served five French regimes",
    "Jean Monnet": "Founding father of the European Union",
    "Simone Veil": "President of the European Parliament",
    "Nicolas Sarkozy": "President of France",
    "Dominique de Villepin": "Prime Minister of France",
    "Manuel Valls": "Prime Minister of France",
    "Christine Lagarde": "French minister and EU official",
    "Ludwig Erhard": "Chancellor of West Germany",
    "Hans-Dietrich Genscher": "Long-serving West German minister",
    "Wolfgang Schäuble": "German cabinet minister",
    "Annalena Baerbock": "German minister and Green Party leader",
    "Boris Pistorius": "German cabinet minister",
    "Nancy Faeser": "German cabinet minister",
    "Julius Caesar": "Roman statesman and dictator",
    "Cicero": "Roman statesman and orator",
    "Niccolò Machiavelli": "Florentine official who wrote The Prince",
    "Giuseppe Garibaldi": "Hero of Italian unification",
    "Mario Draghi": "Prime Minister of Italy",
    "Sergio Mattarella": "President of Italy",
    "Matteo Salvini": "Lega party leader",
    "Antonio Tajani": "Italian minister and Forza Italia leader",
    "Javier Solana": "Spanish minister and EU official",
    "Yolanda Díaz": "Deputy Prime Minister of Spain",
    "António Guterres": "Prime Minister of Portugal",
    "Mark Rutte": "Prime Minister of the Netherlands",
    "Frans Timmermans": "Dutch minister and EU Commissioner",
    "Paul-Henri Spaak": "Prime Minister of Belgium",
    "Klemens von Metternich": "Austrian statesman",
    "Dag Hammarskjöld": "Swedish statesman",
    "Carl Bildt": "Prime Minister of Sweden",
    "Magdalena Andersson": "Prime Minister of Sweden",
    "Jens Stoltenberg": "Prime Minister of Norway",
    "Anders Fogh Rasmussen": "Prime Minister of Denmark",
    "Margrethe Vestager": "Danish minister and EU Commissioner",
    "Carl Gustaf Emil Mannerheim": "President of Finland",
    "Kaja Kallas": "Prime Minister of Estonia",
    "Radosław Sikorski": "Polish cabinet minister",
    "Jan Žižka": "Hussite leader",
    "Jan Masaryk": "Czechoslovak cabinet minister",
    "Milada Horáková": "Czechoslovak politician",
    "Ludvík Svoboda": "President of Czechoslovakia",
    "Karel Schwarzenberg": "Czech cabinet minister",
    "Petr Pavel": "President of the Czech Republic",
    "Vít Rakušan": "Czech cabinet minister",
    "Jan Lipavský": "Czech cabinet minister",
    "Milan Rastislav Štefánik": "Astronomer and co-founder of Czechoslovakia",
    "Miroslav Lajčák": "Slovak cabinet minister",
    "Solon": "Athenian statesman",
    "Yanis Varoufakis": "Greek cabinet minister",
    "Andrei Gromyko": "Soviet minister for 28 years",
    "Sergey Lavrov": "Russian cabinet minister",
    "Alexei Navalny": "Russian opposition leader",
    "Dmytro Kuleba": "Ukrainian cabinet minister",
    "Suleiman the Magnificent": "Ottoman sultan",
    "Moshe Dayan": "Israeli cabinet minister",
    "Mohammad Mosaddegh": "Prime Minister of Iran",
    "Mohammad Javad Zarif": "Iranian cabinet minister",
    "Vallabhbhai Patel": "Deputy Prime Minister of India",
    "B. R. Ambedkar": "Indian statesman and social reformer",
    "Manmohan Singh": "Prime Minister of India",
    "Amit Shah": "Indian cabinet minister",
    "S. Jaishankar": "Indian cabinet minister",
    "Nirmala Sitharaman": "Indian cabinet minister",
    "Muhammad Yunus": "Nobel laureate and Chief Adviser of Bangladesh",
    "Confucius": "Philosopher and official of Lu",
    "Deng Xiaoping": "Paramount leader of China",
    "Zhu Rongji": "Premier of China",
    "Wang Yi": "Chinese cabinet minister",
    "Fumio Kishida": "Prime Minister of Japan",
    "Shigeru Ishiba": "Prime Minister of Japan",
    "Ban Ki-moon": "South Korean statesman",
    "Yoon Suk Yeol": "President of South Korea",
    "Prabowo Subianto": "President of Indonesia",
    "Võ Nguyên Giáp": "Vietnamese revolutionary leader",
    "Paul Keating": "Prime Minister of Australia",
    "Penny Wong": "Australian cabinet minister",
    "Chrystia Freeland": "Deputy Prime Minister of Canada",
    "Mark Carney": "Prime Minister of Canada",
    "Pancho Villa": "Revolutionary leader",
    "Lázaro Cárdenas": "President of Mexico",
    "Marcelo Ebrard": "Mexican cabinet minister",
    "Fernando Haddad": "Brazilian cabinet minister",
    "José de San Martín": "Hero of South American independence",
    "Michelle Bachelet": "President of Chile",
    "Javier Pérez de Cuéllar": "Peruvian statesman",
    "Ngozi Okonjo-Iweala": "Nigerian minister and global official",
    "Kofi Annan": "Ghanaian statesman",
    "Boutros Boutros-Ghali": "Egyptian statesman",
  };
  POLS.forEach((f) => (f.rn = NEUTRAL[f.n] || f.r));

  // Short display names: surnames, with initials when two politicians share one.
  const SHORT = {
    'Lula da Silva': 'Lula', 'Otto von Bismarck': 'Bismarck', "Valéry Giscard d'Estaing": 'Giscard',
    'José de San Martín': 'San Martín', 'Cristina Fernández de Kirchner': 'C. Kirchner', 'Néstor Kirchner': 'N. Kirchner',
    'Andrés Manuel López Obrador': 'AMLO', 'Mustafa Kemal Atatürk': 'Atatürk', 'Ibn Saud': 'Ibn Saud',
    'Sheikh Mujibur Rahman': 'Mujib', 'Qin Shi Huang': 'Qin Shi Huang', 'Li Keqiang': 'Li Keqiang', 'Li Qiang': 'Li Qiang',
    'Lee Kuan Yew': 'Lee Kuan Yew', 'Lee Hsien Loong': 'Lee Hsien Loong', 'Lee Jae-myung': 'Lee Jae-myung',
    'Ho Chi Minh': 'Ho Chi Minh', 'Võ Nguyên Giáp': 'Giáp', 'Itō Hirobumi': 'Itō', 'Napoleon Bonaparte': 'Napoleon',
    'Cardinal Richelieu': 'Richelieu', 'Mahatma Gandhi': 'Gandhi', 'Indira Gandhi': 'Indira', 'Rajiv Gandhi': 'Rajiv',
    'Rahul Gandhi': 'Rahul', 'Eleanor Roosevelt': 'Eleanor', 'Eva Perón': 'Evita',
    'Earl Warren': 'Earl Warren', 'Elizabeth Warren': 'E. Warren', 'Klemens von Metternich': 'Metternich',
    'Suleiman the Magnificent': 'Suleiman', 'Franklin D. Roosevelt': 'FDR', 'John F. Kennedy': 'JFK',
    'Robert F. Kennedy': 'RFK', 'Lyndon B. Johnson': 'LBJ', 'Mohammed bin Salman': 'MBS',
    'Javier Pérez de Cuéllar': 'Pérez de Cuéllar', 'Martin Luther King Jr.': 'MLK',
    'Aung San Suu Kyi': 'Suu Kyi', 'Mahathir Mohamad': 'Mahathir',
  };
  const PARTICLES = new Set(['de', 'da', 'di', 'von', 'van', 'der', 'del', 'la', 'le', 'De', 'Van', 'bin', 'el']);
  const SURNAME_FIRST = new Set(['CN', 'TW', 'KR']);
  function shortName(f) {
    if (SHORT[f.n]) return SHORT[f.n];
    const w = f.n.split(' ');
    if (w.length < 2 || / the /.test(f.n) || /^[IVX]+$/.test(w[w.length - 1])) return f.n;
    if (SURNAME_FIRST.has(f.c)) return w[0];
    let i = w.length - 1;
    while (i > 1 && PARTICLES.has(w[i - 1])) i--;
    return w.slice(i).join(' ');
  }
  POLS.forEach((f) => (f.s = shortName(f)));
  const seen = {};
  POLS.forEach((f) => (seen[f.s] = (seen[f.s] || 0) + 1));
  POLS.forEach((f) => {
    if (seen[f.s] < 2 || SHORT[f.n]) return;
    const w = f.n.split(' ');
    f.s = w.slice(0, -1).map((x) => (/^[A-Z]\.$/.test(x) ? x : x[0] + '.')).join(' ') + ' ' + w[w.length - 1];
  });

  const C = {};
  for (const [code, [name, cont]] of Object.entries(COUNTRIES)) C[code] = { code, name, cont };

  window.CC_DATA = { CONTINENTS, COUNTRIES: C, POLS };
})();
