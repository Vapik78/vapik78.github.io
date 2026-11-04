/* Cabinet Clash — politician deck.
   One politician per line:  Name|Country|Era|Fame|Fits|Role|Years|Wikipedia title (optional)
   Era:  h = before 1945, c = 1945–1999, m = 21st century
   Fame: 1 = household name, 2 = well known, 3 = deep cut
   Fits: seats they have real experience for — L Leader, E Economy,
         F Foreign Affairs, D Defence, I Home & Justice ("-" = none) */
(function () {
  'use strict';

  const CONTINENTS = ['Europe', 'North America', 'South America', 'Asia', 'Africa', 'Oceania'];

  const COUNTRIES = {
    US: ['United States', 'North America'], CA: ['Canada', 'North America'], MX: ['Mexico', 'North America'],
    CU: ['Cuba', 'North America'],
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
    VN: ['Vietnam', 'Asia'],
    EG: ['Egypt', 'Africa'], ZA: ['South Africa', 'Africa'], NG: ['Nigeria', 'Africa'], KE: ['Kenya', 'Africa'],
    GH: ['Ghana', 'Africa'], ET: ['Ethiopia', 'Africa'], TZ: ['Tanzania', 'Africa'], SN: ['Senegal', 'Africa'],
    BF: ['Burkina Faso', 'Africa'], CD: ['DR Congo', 'Africa'], LR: ['Liberia', 'Africa'], RW: ['Rwanda', 'Africa'],
    TN: ['Tunisia', 'Africa'],
    AU: ['Australia', 'Oceania'], NZ: ['New Zealand', 'Oceania'],
  };

  const RAW = `
George Washington|US|h|1|LD|1st President of the United States|1732–1799
John Adams|US|h|3|LF|2nd President of the United States|1735–1826
Thomas Jefferson|US|h|1|LF|3rd US President, wrote the Declaration of Independence|1743–1826
Alexander Hamilton|US|h|2|E|First US Treasury Secretary|1755–1804
Benjamin Franklin|US|h|1|F|Founding Father and diplomat|1706–1790
Abraham Lincoln|US|h|1|LD|16th President, led the Union through the Civil War|1809–1865
Ulysses S. Grant|US|h|2|LD|18th US President and Union general|1822–1885
Theodore Roosevelt|US|h|1|LDF|26th President of the United States|1858–1919
Woodrow Wilson|US|h|2|LF|28th US President, champion of the League of Nations|1856–1924
Franklin D. Roosevelt|US|h|1|LED|32nd US President: New Deal and WWII|1882–1945
Eleanor Roosevelt|US|c|2|F|First Lady and UN human-rights diplomat|1884–1962
Harry S. Truman|US|c|2|LD|33rd President of the United States|1884–1972
Dwight D. Eisenhower|US|c|1|LD|34th US President and WWII Supreme Commander|1890–1969
John F. Kennedy|US|c|1|LF|35th President of the United States|1917–1963
Robert F. Kennedy|US|c|2|I|US Attorney General|1925–1968
Lyndon B. Johnson|US|c|2|LI|36th US President, signed the Civil Rights Act|1908–1973
Robert McNamara|US|c|3|D|US Secretary of Defense|1916–2009
Earl Warren|US|c|3|LI|Governor of California and Chief Justice|1891–1974
Richard Nixon|US|c|1|LF|37th President of the United States|1913–1994
Henry Kissinger|US|c|1|F|US Secretary of State|1923–2023
Jimmy Carter|US|c|2|LF|39th US President, Nobel Peace laureate|1924–2024
Ronald Reagan|US|c|1|LE|40th President of the United States|1911–2004
George H. W. Bush|US|c|2|LFD|41st US President, former CIA director|1924–2018
Madeleine Albright|US|c|3|F|First female US Secretary of State|1937–2022
Bill Clinton|US|c|1|LE|42nd President of the United States|b. 1946
Al Gore|US|m|3|L|US Vice President and climate campaigner|b. 1948
George W. Bush|US|m|1|LD|43rd President of the United States|b. 1946
Dick Cheney|US|m|2|D|US Vice President and Defense Secretary|1941–2025
Colin Powell|US|m|2|DF|Secretary of State and four-star general|1937–2021
Condoleezza Rice|US|m|2|F|US Secretary of State|b. 1954
Hillary Clinton|US|m|1|F|US Secretary of State and First Lady|b. 1947
Barack Obama|US|m|1|L|44th President of the United States|b. 1961
Joe Biden|US|m|1|LFI|46th President of the United States|b. 1942
Donald Trump|US|m|1|LE|45th and 47th President of the United States|b. 1946
Kamala Harris|US|m|2|LI|US Vice President, ex-Attorney General of California|b. 1964
Mike Pence|US|m|3|L|US Vice President|b. 1959
JD Vance|US|m|2|L|US Vice President|b. 1984
Bernie Sanders|US|m|2|E|US Senator from Vermont|b. 1941
Nancy Pelosi|US|m|2|L|Speaker of the House|b. 1940
John McCain|US|m|2|D|US Senator and war veteran|1936–2018
John Kerry|US|m|3|F|US Secretary of State|b. 1943
Eric Holder|US|m|3|I|US Attorney General|b. 1951
Elizabeth Warren|US|m|3|E|US Senator from Massachusetts|b. 1949
Janet Yellen|US|m|3|E|US Treasury Secretary and Fed Chair|b. 1946
Alexandria Ocasio-Cortez|US|m|2|-|US Representative from New York|b. 1989
Marco Rubio|US|m|3|F|US Secretary of State|b. 1971
Gavin Newsom|US|m|3|L|Governor of California|b. 1967
Ron DeSantis|US|m|3|LI|Governor of Florida|b. 1978
Elizabeth I|GB|h|1|LF|Queen of England|1533–1603
Robert Peel|GB|h|3|LI|Prime Minister who founded the modern police|1788–1850
Benjamin Disraeli|GB|h|2|LE|Prime Minister of the UK|1804–1881
William Ewart Gladstone|GB|h|2|LE|Four-time UK Prime Minister|1809–1898
David Lloyd George|GB|h|2|LE|Prime Minister of the UK in WWI|1863–1945
Neville Chamberlain|GB|h|3|LE|Prime Minister of the UK|1869–1940
Winston Churchill|GB|h|1|LDEI|Prime Minister of the UK in WWII|1874–1965
Clement Attlee|GB|c|2|LE|Prime Minister who built the welfare state|1883–1967
Harold Wilson|GB|c|3|LE|Prime Minister of the UK|1916–1995
Margaret Thatcher|GB|c|1|LE|First female Prime Minister of the UK|1925–2013
John Major|GB|c|3|LEF|Prime Minister of the UK|b. 1943
Tony Blair|GB|m|1|LF|Prime Minister of the UK|b. 1953
Gordon Brown|GB|m|3|LE|Prime Minister and Chancellor|b. 1951
Jack Straw|GB|m|3|FI|Home Secretary and Foreign Secretary|b. 1946
David Cameron|GB|m|2|LF|Prime Minister and Foreign Secretary|b. 1966
Theresa May|GB|m|2|LI|Prime Minister and Home Secretary|b. 1956
Boris Johnson|GB|m|1|LF|Prime Minister of the UK|b. 1964
Liz Truss|GB|m|3|LF|Prime Minister of the UK|b. 1975
Rishi Sunak|GB|m|3|LE|Prime Minister and Chancellor|b. 1980
Priti Patel|GB|m|3|I|UK Home Secretary|b. 1972
Keir Starmer|GB|m|2|LI|Prime Minister, ex-Director of Public Prosecutions|b. 1962
Jeremy Corbyn|GB|m|3|-|Former Labour Party leader|b. 1949
Nigel Farage|GB|m|2|-|Brexit campaigner and Reform UK leader|b. 1964
Kemi Badenoch|GB|m|3|E|Conservative Party leader|b. 1980
Rachel Reeves|GB|m|3|E|First female Chancellor of the Exchequer|b. 1979
Cardinal Richelieu|FR|h|2|LF|Chief minister of King Louis XIII|1585–1642
Maximilien Robespierre|FR|h|2|I|Leader of the French Revolution|1758–1794
Talleyrand|FR|h|3|F|Diplomat who served five French regimes|1754–1838|Charles Maurice de Talleyrand-Périgord
Napoleon Bonaparte|FR|h|1|LD|Emperor of the French|1769–1821|Napoleon
Georges Clemenceau|FR|h|2|LD|Prime Minister of France in WWI|1841–1929
Charles de Gaulle|FR|c|1|LD|President of France, leader of Free France|1890–1970
Robert Schuman|FR|c|3|F|Founding father of the European Union|1886–1963
Jean Monnet|FR|c|3|E|Architect of European integration|1888–1979
Simone Veil|FR|c|2|I|Minister and President of the European Parliament|1927–2017
Valéry Giscard d'Estaing|FR|c|3|LE|President of France|1926–2020
François Mitterrand|FR|c|2|L|President of France|1916–1996
Jacques Delors|FR|c|3|E|President of the European Commission|1925–2023
Jacques Chirac|FR|c|2|L|President of France|1932–2019
Nicolas Sarkozy|FR|m|2|LI|President of France, ex-Interior Minister|b. 1955
François Hollande|FR|m|3|L|President of France|b. 1954
Dominique de Villepin|FR|m|3|LFI|Prime Minister, Foreign and Interior Minister|b. 1953
Manuel Valls|FR|m|3|LI|Prime Minister and Interior Minister of France|b. 1962
Emmanuel Macron|FR|m|1|LE|President of France|b. 1977
Christine Lagarde|FR|m|2|E|President of the European Central Bank|b. 1956
Marine Le Pen|FR|m|2|-|National Rally leader|b. 1968
Jordan Bardella|FR|m|3|-|President of the National Rally|b. 1995
Jean-Luc Mélenchon|FR|m|3|-|Leader of La France Insoumise|b. 1951
Gabriel Attal|FR|m|3|L|Youngest Prime Minister of France|b. 1989
Otto von Bismarck|DE|h|1|LF|First Chancellor of the German Empire|1815–1898
Konrad Adenauer|DE|c|2|LF|First Chancellor of West Germany|1876–1967
Ludwig Erhard|DE|c|3|LE|Father of the German economic miracle|1897–1977
Willy Brandt|DE|c|2|LF|Chancellor of West Germany, Nobel Peace laureate|1913–1992
Helmut Schmidt|DE|c|3|LED|Chancellor of West Germany|1918–2015
Hans-Dietrich Genscher|DE|c|3|F|Long-serving West German Foreign Minister|1927–2016
Helmut Kohl|DE|c|2|L|Chancellor of German reunification|1930–2017
Gerhard Schröder|DE|m|3|L|Chancellor of Germany|b. 1944
Angela Merkel|DE|m|1|L|Chancellor of Germany for 16 years|b. 1954
Wolfgang Schäuble|DE|m|3|EI|Finance and Interior Minister|1942–2023
Ursula von der Leyen|DE|m|2|LD|President of the European Commission|b. 1958
Olaf Scholz|DE|m|2|LE|Chancellor of Germany|b. 1958
Friedrich Merz|DE|m|2|L|Chancellor of Germany|b. 1955
Annalena Baerbock|DE|m|3|F|German Foreign Minister|b. 1980
Boris Pistorius|DE|m|3|D|German Defence Minister|b. 1960
Nancy Faeser|DE|m|3|I|German Interior Minister|b. 1970
Alice Weidel|DE|m|3|-|Co-leader of the AfD|b. 1979
Julius Caesar|IT|h|1|LD|Roman general and dictator|100–44 BC
Cicero|IT|h|2|I|Roman statesman, lawyer and orator|106–43 BC
Augustus|IT|h|2|L|First Roman emperor|63 BC–AD 14
Marcus Aurelius|IT|h|2|LD|Roman emperor and Stoic philosopher|121–180
Niccolò Machiavelli|IT|h|1|F|Florentine diplomat who wrote The Prince|1469–1527
Camillo Cavour|IT|h|2|LF|First Prime Minister of Italy|1810–1861|Camillo Benso, Count of Cavour
Giuseppe Garibaldi|IT|h|2|D|General of Italian unification|1807–1882
Alcide De Gasperi|IT|c|3|LF|Prime Minister who rebuilt postwar Italy|1881–1954
Sandro Pertini|IT|c|3|L|President of Italy|1896–1990
Aldo Moro|IT|c|3|LF|Prime Minister of Italy|1916–1978
Giulio Andreotti|IT|c|3|LF|Seven-time Prime Minister of Italy|1919–2013
Enrico Berlinguer|IT|c|3|-|Leader of the Italian Communist Party|1922–1984
Bettino Craxi|IT|c|3|L|Prime Minister of Italy|1934–2000
Silvio Berlusconi|IT|m|1|LE|Media tycoon and Prime Minister of Italy|1936–2023
Romano Prodi|IT|m|3|LE|Prime Minister and EU Commission President|b. 1939
Mario Draghi|IT|m|2|LE|Prime Minister and ECB President|b. 1947
Sergio Mattarella|IT|m|3|LI|President of Italy, ex-constitutional judge|b. 1941
Matteo Renzi|IT|m|3|L|Prime Minister of Italy|b. 1975
Giuseppe Conte|IT|m|3|LI|Prime Minister of Italy|b. 1964
Giorgia Meloni|IT|m|2|L|Prime Minister of Italy|b. 1977
Matteo Salvini|IT|m|2|I|Lega leader and ex-Interior Minister|b. 1973
Antonio Tajani|IT|m|3|F|Italian Foreign Minister|b. 1953
Elly Schlein|IT|m|3|-|Democratic Party leader|b. 1985
Adolfo Suárez|ES|c|3|L|Prime Minister of Spain's democratic transition|1932–2014
Felipe González|ES|c|3|L|Prime Minister of Spain|b. 1942
José María Aznar|ES|m|3|L|Prime Minister of Spain|b. 1953
José Luis Rodríguez Zapatero|ES|m|3|L|Prime Minister of Spain|b. 1960
Mariano Rajoy|ES|m|3|LE|Prime Minister of Spain|b. 1955
Pedro Sánchez|ES|m|2|L|Prime Minister of Spain|b. 1972
Javier Solana|ES|m|3|FD|NATO Secretary General and EU foreign policy chief|b. 1942
Alberto Núñez Feijóo|ES|m|3|-|People's Party leader|b. 1961
Santiago Abascal|ES|m|3|-|Vox party leader|b. 1976
Isabel Díaz Ayuso|ES|m|3|L|President of the Community of Madrid|b. 1978
Yolanda Díaz|ES|m|3|E|Spanish Labour Minister|b. 1971
Mário Soares|PT|c|3|L|President and Prime Minister of Portugal|1924–2017
José Manuel Barroso|PT|m|3|L|President of the European Commission|b. 1956
António Guterres|PT|m|2|LF|UN Secretary-General|b. 1949
António Costa|PT|m|3|L|President of the European Council|b. 1961
Daniel O'Connell|IE|h|3|I|Champion of Catholic emancipation|1775–1847
Michael Collins|IE|h|2|D|Irish revolutionary leader|1890–1922|Michael Collins (Irish leader)
Éamon de Valera|IE|h|2|L|Taoiseach and President of Ireland|1882–1975
Mary Robinson|IE|c|3|L|First female President of Ireland|b. 1944
Leo Varadkar|IE|m|3|L|Taoiseach of Ireland|b. 1979
William the Silent|NL|h|3|LD|Leader of the Dutch Revolt|1533–1584
Mark Rutte|NL|m|2|LFD|Dutch Prime Minister and NATO Secretary General|b. 1967
Frans Timmermans|NL|m|3|F|Dutch Foreign Minister and EU Commissioner|b. 1961
Geert Wilders|NL|m|3|-|Party for Freedom leader|b. 1963
Paul-Henri Spaak|BE|c|3|F|Belgian PM and NATO Secretary General|1899–1972
Guy Verhofstadt|BE|m|3|L|Prime Minister of Belgium|b. 1953
Herman Van Rompuy|BE|m|3|L|First President of the European Council|b. 1947
Charles Michel|BE|m|3|L|Belgian PM and European Council President|b. 1975
Maria Theresa|AT|h|2|LE|Habsburg empress and reformer|1717–1780
Klemens von Metternich|AT|h|2|F|Architect of the Congress of Vienna|1773–1859
Bruno Kreisky|AT|c|3|LF|Chancellor of Austria|1911–1990
Alexander Van der Bellen|AT|m|3|L|President of Austria|b. 1944
Sebastian Kurz|AT|m|3|LF|Chancellor of Austria|b. 1986
Dag Hammarskjöld|SE|c|2|F|UN Secretary-General|1905–1961
Olof Palme|SE|c|2|LF|Prime Minister of Sweden|1927–1986
Carl Bildt|SE|m|3|LF|Swedish PM and Foreign Minister|b. 1949
Magdalena Andersson|SE|m|3|LE|Prime Minister and Finance Minister of Sweden|b. 1967
Ulf Kristersson|SE|m|3|L|Prime Minister of Sweden|b. 1963
Gro Harlem Brundtland|NO|c|3|L|Prime Minister of Norway|b. 1939
Jens Stoltenberg|NO|m|2|LDE|NATO Secretary General and Norwegian PM|b. 1959
Anders Fogh Rasmussen|DK|m|3|LD|Danish PM and NATO Secretary General|b. 1953
Margrethe Vestager|DK|m|3|E|EU Competition Commissioner|b. 1968
Mette Frederiksen|DK|m|3|L|Prime Minister of Denmark|b. 1977
Carl Gustaf Emil Mannerheim|FI|h|3|LD|Marshal and President of Finland|1867–1951
Urho Kekkonen|FI|c|3|LF|President of Finland|1900–1986
Sauli Niinistö|FI|m|3|LE|President of Finland|b. 1948
Sanna Marin|FI|m|3|L|Prime Minister of Finland|b. 1985
Alexander Stubb|FI|m|3|LF|President of Finland|b. 1968
Kaja Kallas|EE|m|3|LF|Estonian PM and EU foreign policy chief|b. 1977
Józef Piłsudski|PL|h|2|LD|Founder of the Second Polish Republic|1867–1935
Lech Wałęsa|PL|c|2|L|Solidarity leader and President of Poland|b. 1943
Tadeusz Mazowiecki|PL|c|3|L|First non-communist PM of Poland|1927–2013
Donald Tusk|PL|m|2|L|Polish PM and European Council President|b. 1957
Jarosław Kaczyński|PL|m|3|-|Law and Justice party leader|b. 1949
Andrzej Duda|PL|m|3|L|President of Poland|b. 1972
Radosław Sikorski|PL|m|3|FD|Polish Foreign and Defence Minister|b. 1963
Karol Nawrocki|PL|m|3|L|President of Poland|b. 1983
Charles IV|CZ|h|2|LF|King of Bohemia and Holy Roman Emperor|1316–1378|Charles IV, Holy Roman Emperor
Jan Žižka|CZ|h|3|D|Undefeated Hussite general|c. 1360–1424
Tomáš Garrigue Masaryk|CZ|h|2|LF|Founder and first President of Czechoslovakia|1850–1937
Edvard Beneš|CZ|h|3|LF|President of Czechoslovakia|1884–1948
Jan Masaryk|CZ|c|3|F|Czechoslovak Foreign Minister|1886–1948
Milada Horáková|CZ|c|3|I|Lawyer and politician|1901–1950
Ludvík Svoboda|CZ|c|3|LD|General and President of Czechoslovakia|1895–1979
Václav Havel|CZ|c|2|L|Playwright, dissident and President|1936–2011
Václav Klaus|CZ|m|3|LE|Czech President and Prime Minister|b. 1941
Miloš Zeman|CZ|m|3|L|Czech President and Prime Minister|b. 1944
Mirek Topolánek|CZ|m|3|L|Czech Prime Minister|b. 1956
Bohuslav Sobotka|CZ|m|3|L|Czech Prime Minister|b. 1971
Karel Schwarzenberg|CZ|m|3|F|Czech Foreign Minister|1937–2023
Andrej Babiš|CZ|m|3|LE|Czech Prime Minister and billionaire|b. 1954
Petr Fiala|CZ|m|3|L|Czech Prime Minister|b. 1964
Petr Pavel|CZ|m|3|LD|Czech President, ex-NATO general|b. 1961
Tomio Okamura|CZ|m|3|-|SPD party leader|b. 1972
Vít Rakušan|CZ|m|3|I|Czech Interior Minister|b. 1978
Jan Lipavský|CZ|m|3|F|Czech Foreign Minister|b. 1985
Milan Rastislav Štefánik|SK|h|3|DF|General, astronomer and co-founder of Czechoslovakia|1880–1919
Alexander Dubček|SK|c|2|L|Leader of the Prague Spring|1921–1992
Vladimír Mečiar|SK|c|3|L|Prime Minister of Slovakia|b. 1942
Mikuláš Dzurinda|SK|m|3|LF|Prime Minister of Slovakia|b. 1955
Ivan Gašparovič|SK|m|3|L|President of Slovakia|b. 1941
Iveta Radičová|SK|m|3|L|First female Prime Minister of Slovakia|b. 1956
Robert Fico|SK|m|3|L|Prime Minister of Slovakia|b. 1964
Miroslav Lajčák|SK|m|3|F|Slovak Foreign Minister and UN General Assembly President|b. 1963
Zuzana Čaputová|SK|m|3|LI|First female President of Slovakia|b. 1973
Peter Pellegrini|SK|m|3|L|President of Slovakia|b. 1975
Igor Matovič|SK|m|3|L|Prime Minister of Slovakia|b. 1973
Michal Šimečka|SK|m|3|-|Progressive Slovakia leader|b. 1984
Lajos Kossuth|HU|h|3|L|Leader of the 1848 Hungarian revolution|1802–1894
Imre Nagy|HU|c|3|L|Prime Minister during the 1956 revolution|1896–1958
Viktor Orbán|HU|m|2|L|Prime Minister of Hungary|b. 1963
Katalin Novák|HU|m|3|L|President of Hungary|b. 1977
Péter Magyar|HU|m|3|-|Leader of the Tisza party|b. 1981
Solon|GR|h|3|I|Athenian lawgiver|c. 630–560 BC
Pericles|GR|h|2|LD|Statesman of Athens' golden age|c. 495–429 BC
Eleftherios Venizelos|GR|h|3|LF|Prime Minister of Greece|1864–1936
Andreas Papandreou|GR|c|3|L|Prime Minister of Greece|1919–1996
Alexis Tsipras|GR|m|3|L|Prime Minister of Greece|b. 1974
Yanis Varoufakis|GR|m|3|E|Greek Finance Minister|b. 1961
Kyriakos Mitsotakis|GR|m|3|L|Prime Minister of Greece|b. 1968
Peter the Great|RU|h|1|LD|Tsar who modernised Russia|1672–1725
Catherine the Great|RU|h|1|LF|Empress of Russia|1729–1796
Alexander Kerensky|RU|h|3|L|Head of Russia's Provisional Government|1881–1970
Andrei Gromyko|RU|c|3|F|Soviet Foreign Minister for 28 years|1909–1989
Nikita Khrushchev|RU|c|2|L|Soviet leader|1894–1971
Mikhail Gorbachev|RU|c|1|LF|Last leader of the Soviet Union|1931–2022
Boris Yeltsin|RU|c|2|L|First President of Russia|1931–2007
Vladimir Putin|RU|m|1|LD|President of Russia|b. 1952
Dmitry Medvedev|RU|m|3|L|President and Prime Minister of Russia|b. 1965
Sergey Lavrov|RU|m|2|F|Russian Foreign Minister|b. 1950
Alexei Navalny|RU|m|2|I|Opposition leader and anti-corruption activist|1976–2024
Volodymyr Zelenskyy|UA|m|1|LD|President of Ukraine|b. 1978
Yulia Tymoshenko|UA|m|3|LE|Prime Minister of Ukraine|b. 1960
Petro Poroshenko|UA|m|3|L|President of Ukraine|b. 1965
Vitali Klitschko|UA|m|3|-|Mayor of Kyiv and boxing champion|b. 1971
Dmytro Kuleba|UA|m|3|F|Ukrainian Foreign Minister|b. 1981
Suleiman the Magnificent|TR|h|2|LI|Ottoman sultan known as the Lawgiver|1494–1566
Mustafa Kemal Atatürk|TR|h|1|LD|Founder of the Republic of Turkey|1881–1938
Recep Tayyip Erdoğan|TR|m|2|L|President of Turkey|b. 1954
Ekrem İmamoğlu|TR|m|3|L|Mayor of Istanbul|b. 1970
David Ben-Gurion|IL|c|2|LD|Founding Prime Minister of Israel|1886–1973
Golda Meir|IL|c|2|LF|Prime Minister of Israel|1898–1978
Menachem Begin|IL|c|3|L|Prime Minister, Nobel Peace laureate|1913–1992
Moshe Dayan|IL|c|3|DF|Defence and Foreign Minister of Israel|1915–1981
Yitzhak Rabin|IL|c|2|LD|Prime Minister, Nobel Peace laureate|1922–1995
Shimon Peres|IL|c|3|LF|President and Prime Minister of Israel|1923–2016
Benjamin Netanyahu|IL|m|1|LE|Longest-serving Prime Minister of Israel|b. 1949
Yasser Arafat|PS|c|2|L|PLO chairman, Nobel Peace laureate|1929–2004
Mahmoud Abbas|PS|m|3|L|President of the Palestinian Authority|b. 1935
King Hussein|JO|c|3|LF|King of Jordan|1935–1999|Hussein of Jordan
Cyrus the Great|IR|h|2|LD|Founder of the Persian Empire|c. 600–530 BC
Mohammad Mosaddegh|IR|c|3|LE|Prime Minister who nationalised Iran's oil|1882–1967
Hassan Rouhani|IR|m|3|L|President of Iran|b. 1948
Mohammad Javad Zarif|IR|m|3|F|Iranian Foreign Minister|b. 1960
Masoud Pezeshkian|IR|m|3|L|President of Iran|b. 1954
Ibn Saud|SA|h|3|LD|Founder of Saudi Arabia|1875–1953
King Faisal|SA|c|3|LF|King of Saudi Arabia|1906–1975|Faisal of Saudi Arabia
Mohammed bin Salman|SA|m|2|LE|Crown Prince and Prime Minister of Saudi Arabia|b. 1985
Ashoka|IN|h|2|L|Mauryan emperor|c. 304–232 BC
Mahatma Gandhi|IN|h|1|L|Leader of India's independence movement|1869–1948
Subhas Chandra Bose|IN|h|3|D|Independence leader|1897–1945
Jawaharlal Nehru|IN|c|1|LF|First Prime Minister of India|1889–1964
Vallabhbhai Patel|IN|c|2|I|First Home Minister of India|1875–1950
B. R. Ambedkar|IN|c|2|I|Architect of India's constitution|1891–1956
Indira Gandhi|IN|c|1|L|Prime Minister of India|1917–1984
Rajiv Gandhi|IN|c|3|L|Prime Minister of India|1944–1991
Atal Bihari Vajpayee|IN|m|3|LF|Prime Minister of India|1924–2018
Manmohan Singh|IN|m|2|LE|Prime Minister and reformist Finance Minister|1932–2024
Narendra Modi|IN|m|1|L|Prime Minister of India|b. 1950
Amit Shah|IN|m|3|I|Indian Home Minister|b. 1964
S. Jaishankar|IN|m|3|F|Indian External Affairs Minister|b. 1955
Nirmala Sitharaman|IN|m|3|ED|Indian Finance and Defence Minister|b. 1959
Rahul Gandhi|IN|m|3|-|Leader of the Opposition in India|b. 1970
Arvind Kejriwal|IN|m|3|L|Chief Minister of Delhi|b. 1968
Muhammad Ali Jinnah|PK|c|2|L|Founder of Pakistan|1876–1948
Zulfikar Ali Bhutto|PK|c|3|LF|President and Prime Minister of Pakistan|1928–1979
Benazir Bhutto|PK|c|2|L|First female Prime Minister of Pakistan|1953–2007
Nawaz Sharif|PK|m|3|L|Three-time Prime Minister of Pakistan|b. 1949
Imran Khan|PK|m|2|L|Prime Minister and cricket legend|b. 1952
Shehbaz Sharif|PK|m|3|L|Prime Minister of Pakistan|b. 1951
Sheikh Mujibur Rahman|BD|c|3|L|Founding father of Bangladesh|1920–1975
Sheikh Hasina|BD|m|3|L|Prime Minister of Bangladesh|b. 1947
Muhammad Yunus|BD|m|3|E|Microfinance pioneer and Chief Adviser|b. 1940
Confucius|CN|h|1|I|Philosopher and minister of Lu|551–479 BC
Qin Shi Huang|CN|h|2|LD|First emperor of a unified China|259–210 BC
Sun Yat-sen|CN|h|2|L|Founding father of the Republic of China|1866–1925
Zhou Enlai|CN|c|2|LF|First Premier of the People's Republic of China|1898–1976
Deng Xiaoping|CN|c|1|LE|Architect of China's economic reforms|1904–1997
Jiang Zemin|CN|c|3|L|Paramount leader of China|1926–2022
Zhu Rongji|CN|c|3|E|Premier of China and economic reformer|b. 1928
Hu Jintao|CN|m|3|L|President of China|b. 1942
Xi Jinping|CN|m|1|LD|President of China|b. 1953
Li Keqiang|CN|m|3|E|Premier of China|1955–2023
Li Qiang|CN|m|3|E|Premier of China|b. 1959
Wang Yi|CN|m|3|F|Chinese Foreign Minister|b. 1953
Chiang Kai-shek|TW|c|2|LD|Leader of the Republic of China|1887–1975
Tsai Ing-wen|TW|m|3|L|First female President of Taiwan|b. 1956
Lai Ching-te|TW|m|3|L|President of Taiwan|b. 1959
Itō Hirobumi|JP|h|3|LF|First Prime Minister of Japan|1841–1909
Shigeru Yoshida|JP|c|3|LF|Prime Minister of postwar Japan|1878–1967
Kakuei Tanaka|JP|c|3|LE|Prime Minister of Japan|1918–1993
Yasuhiro Nakasone|JP|c|3|LD|Prime Minister of Japan|1918–2019
Junichiro Koizumi|JP|m|3|L|Prime Minister of Japan|b. 1942
Shinzo Abe|JP|m|2|LE|Longest-serving Prime Minister of Japan|1954–2022
Fumio Kishida|JP|m|3|LF|Prime Minister and Foreign Minister of Japan|b. 1957
Shigeru Ishiba|JP|m|3|LD|Prime Minister and ex-Defence Minister|b. 1957
Sanae Takaichi|JP|m|3|LI|First female Prime Minister of Japan|b. 1961
Kim Dae-jung|KR|c|3|L|President, Nobel Peace laureate|1924–2009
Ban Ki-moon|KR|m|2|F|UN Secretary-General|b. 1944
Moon Jae-in|KR|m|3|L|President of South Korea|b. 1953
Yoon Suk Yeol|KR|m|3|LI|President of South Korea, ex-prosecutor|b. 1960
Lee Jae-myung|KR|m|3|L|President of South Korea|b. 1963
Lee Kuan Yew|SG|c|2|LE|Founding Prime Minister of Singapore|1923–2015
Lee Hsien Loong|SG|m|3|LE|Prime Minister of Singapore|b. 1952
Lawrence Wong|SG|m|3|LE|Prime Minister of Singapore|b. 1972
Sukarno|ID|c|2|L|First President of Indonesia|1901–1970
Joko Widodo|ID|m|3|L|President of Indonesia|b. 1961
Prabowo Subianto|ID|m|3|LD|President of Indonesia, ex-general|b. 1951
José Rizal|PH|h|3|-|National hero of the Philippines|1861–1896
Corazon Aquino|PH|c|3|L|First female President of the Philippines|1933–2009
Bongbong Marcos|PH|m|3|L|President of the Philippines|b. 1957
Ho Chi Minh|VN|c|1|LF|Founding leader of modern Vietnam|1890–1969
Võ Nguyên Giáp|VN|c|3|D|Vietnamese general|1911–2013
John Curtin|AU|h|3|LD|Prime Minister of Australia in WWII|1885–1945
Robert Menzies|AU|c|3|L|Longest-serving Prime Minister of Australia|1894–1978
Bob Hawke|AU|c|3|LE|Prime Minister of Australia|1929–2019
Paul Keating|AU|c|3|LE|Prime Minister and Treasurer|b. 1944
John Howard|AU|m|3|L|Prime Minister of Australia|b. 1939
Kevin Rudd|AU|m|3|LF|Prime Minister of Australia|b. 1957
Julia Gillard|AU|m|3|L|First female Prime Minister of Australia|b. 1961
Malcolm Turnbull|AU|m|3|L|Prime Minister of Australia|b. 1954
Scott Morrison|AU|m|3|LE|Prime Minister of Australia|b. 1968
Anthony Albanese|AU|m|3|L|Prime Minister of Australia|b. 1963
Penny Wong|AU|m|3|F|Australian Foreign Minister|b. 1968
Richard Seddon|NZ|h|3|L|Longest-serving PM of New Zealand|1845–1906
David Lange|NZ|c|3|LF|Prime Minister of New Zealand|1942–2005
Helen Clark|NZ|m|3|L|Prime Minister of New Zealand|b. 1950
Jacinda Ardern|NZ|m|2|L|Prime Minister of New Zealand|b. 1980
Christopher Luxon|NZ|m|3|L|Prime Minister of New Zealand|b. 1970
John A. Macdonald|CA|h|3|L|First Prime Minister of Canada|1815–1891
Wilfrid Laurier|CA|h|3|L|Prime Minister of Canada|1841–1919
Lester B. Pearson|CA|c|3|LF|PM and Nobel Peace laureate|1897–1972
Pierre Trudeau|CA|c|2|L|Prime Minister of Canada|1919–2000
Brian Mulroney|CA|c|3|L|Prime Minister of Canada|1939–2024
Jean Chrétien|CA|c|3|L|Prime Minister of Canada|b. 1934
Stephen Harper|CA|m|3|L|Prime Minister of Canada|b. 1959
Justin Trudeau|CA|m|1|L|Prime Minister of Canada|b. 1971
Chrystia Freeland|CA|m|3|EF|Deputy PM, Finance and Foreign Minister|b. 1968
Mark Carney|CA|m|2|LE|Prime Minister of Canada, ex-central banker|b. 1965
Pierre Poilievre|CA|m|3|-|Conservative Party leader|b. 1979
Benito Juárez|MX|h|2|LI|President of Mexico and liberal reformer|1806–1872
Emiliano Zapata|MX|h|2|D|Revolutionary leader|1879–1919
Pancho Villa|MX|h|3|D|Revolutionary general|1878–1923
Lázaro Cárdenas|MX|h|3|LE|President who nationalised Mexican oil|1895–1970
Vicente Fox|MX|m|3|L|President of Mexico|b. 1942
Felipe Calderón|MX|m|3|LI|President of Mexico|b. 1962
Andrés Manuel López Obrador|MX|m|2|L|President of Mexico|b. 1953
Claudia Sheinbaum|MX|m|2|L|First female President of Mexico|b. 1962
Marcelo Ebrard|MX|m|3|FE|Mexican Foreign and Economy Minister|b. 1959
José Martí|CU|h|3|-|Cuban national hero and writer|1853–1895
Fidel Castro|CU|c|1|LD|Leader of Cuba|1926–2016
Pedro II|BR|h|3|L|Emperor of Brazil|1825–1891|Pedro II of Brazil
Getúlio Vargas|BR|h|3|LE|President of Brazil|1882–1954
Juscelino Kubitschek|BR|c|3|LE|President who built Brasília|1902–1976
Fernando Henrique Cardoso|BR|c|3|LE|President of Brazil|b. 1931
Lula da Silva|BR|m|1|L|President of Brazil|b. 1945|Luiz Inácio Lula da Silva
Dilma Rousseff|BR|m|3|LE|First female President of Brazil|b. 1947
Jair Bolsonaro|BR|m|2|LD|President of Brazil|b. 1955
Marina Silva|BR|m|3|-|Brazilian Environment Minister|b. 1958
Fernando Haddad|BR|m|3|E|Brazilian Finance Minister|b. 1963
José de San Martín|AR|h|2|D|Liberator of Argentina, Chile and Peru|1778–1850
Juan Perón|AR|c|2|L|Three-time President of Argentina|1895–1974
Eva Perón|AR|c|2|-|First Lady and political icon|1919–1952
Raúl Alfonsín|AR|c|3|L|President who restored Argentine democracy|1927–2009
Néstor Kirchner|AR|m|3|LE|President of Argentina|1950–2010
Cristina Fernández de Kirchner|AR|m|3|L|President of Argentina|b. 1953
Mauricio Macri|AR|m|3|L|President of Argentina|b. 1959
Javier Milei|AR|m|2|LE|President of Argentina|b. 1970
Simón Bolívar|VE|h|1|LD|Liberator of South America|1783–1830
Hugo Chávez|VE|m|2|L|President of Venezuela|1954–2013
María Corina Machado|VE|m|3|-|Opposition leader, Nobel Peace laureate|b. 1967
Bernardo O'Higgins|CL|h|3|LD|Liberator of Chile|1778–1842
Salvador Allende|CL|c|2|L|President of Chile|1908–1973
Michelle Bachelet|CL|m|3|LD|President of Chile, ex-Defence Minister|b. 1951
Sebastián Piñera|CL|m|3|LE|President of Chile|1949–2024
Gabriel Boric|CL|m|3|L|President of Chile|b. 1986
Francisco de Paula Santander|CO|h|3|LI|Founding President of Colombia|1792–1840
Álvaro Uribe|CO|m|3|LD|President of Colombia|b. 1952
Juan Manuel Santos|CO|m|3|LD|President of Colombia, Nobel Peace laureate|b. 1951
Gustavo Petro|CO|m|3|L|President of Colombia|b. 1960
Javier Pérez de Cuéllar|PE|c|3|F|UN Secretary-General|1920–2020
José Mujica|UY|m|2|L|President of Uruguay|1935–2025
Evo Morales|BO|m|3|L|President of Bolivia|b. 1959
Nelson Mandela|ZA|c|1|L|First President of democratic South Africa|1918–2013
Oliver Tambo|ZA|c|3|F|ANC leader in exile|1917–1993
F. W. de Klerk|ZA|c|3|L|President who ended apartheid|1936–2021
Thabo Mbeki|ZA|m|3|LF|President of South Africa|b. 1942
Jacob Zuma|ZA|m|3|L|President of South Africa|b. 1942
Cyril Ramaphosa|ZA|m|3|LE|President of South Africa|b. 1952
Julius Malema|ZA|m|3|-|Economic Freedom Fighters leader|b. 1981
Nnamdi Azikiwe|NG|c|3|L|First President of Nigeria|1904–1996
Olusegun Obasanjo|NG|m|3|LD|President of Nigeria|b. 1937
Muhammadu Buhari|NG|m|3|LD|President of Nigeria|1942–2025
Goodluck Jonathan|NG|m|3|L|President of Nigeria|b. 1957
Bola Tinubu|NG|m|3|L|President of Nigeria|b. 1952
Ngozi Okonjo-Iweala|NG|m|3|EF|WTO Director-General|b. 1954
Jomo Kenyatta|KE|c|3|L|First President of Kenya|1897–1978
Wangari Maathai|KE|m|3|-|Environmentalist and Nobel Peace laureate|1940–2011
Raila Odinga|KE|m|3|L|Prime Minister of Kenya|1945–2025
Uhuru Kenyatta|KE|m|3|L|President of Kenya|b. 1961
William Ruto|KE|m|3|L|President of Kenya|b. 1966
Kwame Nkrumah|GH|c|2|L|First President of Ghana|1909–1972
Jerry Rawlings|GH|c|3|LD|President of Ghana|1947–2020
Kofi Annan|GH|m|2|F|UN Secretary-General|1938–2018
John Mahama|GH|m|3|L|President of Ghana|b. 1958
Haile Selassie|ET|c|2|LF|Emperor of Ethiopia|1892–1975
Abiy Ahmed|ET|m|3|L|Prime Minister, Nobel Peace laureate|b. 1976
Julius Nyerere|TZ|c|3|L|Founding President of Tanzania|1922–1999
Samia Suluhu Hassan|TZ|m|3|L|President of Tanzania|b. 1960
Léopold Sédar Senghor|SN|c|3|L|Poet and first President of Senegal|1906–2001
Thomas Sankara|BF|c|3|L|President of Burkina Faso|1949–1987
Patrice Lumumba|CD|c|2|L|First Prime Minister of Congo|1925–1961
Ellen Johnson Sirleaf|LR|m|3|LE|Africa's first elected female head of state|b. 1938
Paul Kagame|RW|m|3|LD|President of Rwanda|b. 1957
Habib Bourguiba|TN|c|3|L|First President of Tunisia|1903–2000
Cleopatra|EG|h|1|LF|Last ruler of Ptolemaic Egypt|69–30 BC
Gamal Abdel Nasser|EG|c|2|L|President of Egypt|1918–1970
Anwar Sadat|EG|c|2|LF|President of Egypt, Nobel Peace laureate|1918–1981
Hosni Mubarak|EG|c|3|LD|President of Egypt|1928–2020
Boutros Boutros-Ghali|EG|c|3|F|UN Secretary-General|1922–2016
Abdel Fattah el-Sisi|EG|m|3|LD|President of Egypt|b. 1954
`;

  const POLS = RAW.trim().split('\n').map((line, i) => {
    const [n, c, e, t, tags, r, y, w] = line.split('|');
    return { i, n, c, e, t: +t, tags: tags === '-' ? '' : tags, r, y, w: w || n };
  });

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
    'Javier Pérez de Cuéllar': 'Pérez de Cuéllar',
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
