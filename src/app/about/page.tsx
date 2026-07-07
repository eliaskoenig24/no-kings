'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/context/LangContext';

const TX = {
  label:        { de: 'ÜBER DIE PLATTFORM', en: 'ABOUT THE PLATFORM', es: 'SOBRE LA PLATAFORMA', fr: 'À PROPOS DE LA PLATEFORME', pt: 'SOBRE A PLATAFORMA', ar: 'حول المنصة', zh: '关于平台', ja: 'プラットフォームについて', hi: 'प्लेटफॉर्म के बारे में', ru: 'О ПЛАТФОРМЕ', id: 'TENTANG PLATFORM', tr: 'PLATFORM HAKKINDA', ko: '플랫폼 소개', it: 'SULLA PIATTAFORMA', nl: 'OVER HET PLATFORM', pl: 'O PLATFORMIE', uk: 'ПРО ПЛАТФОРМУ', vi: 'VỀ NỀN TẢNG', bn: 'প্ল্যাটফর্ম সম্পর্কে', fa: 'درباره پلتفرم' },
  title:        { de: 'Die erste permanente Stimme der Menschheit', en: 'The first permanent voice of humanity', es: 'La primera voz permanente de la humanidad', fr: 'La première voix permanente de l\'humanité', pt: 'A primeira voz permanente da humanidade', ar: 'الصوت الدائم الأول للبشرية', zh: '人类第一个永久的声音', ja: '人類初の永久的な声', hi: 'मानवता की पहली स्थायी आवाज़', ru: 'Первый постоянный голос человечества', id: 'Suara permanen pertama umat manusia', tr: 'İnsanlığın ilk kalıcı sesi', ko: '인류 최초의 영구적인 목소리', it: 'La prima voce permanente dell\'umanità', nl: 'De eerste permanente stem van de mensheid', pl: 'Pierwszy stały głos ludzkości', uk: 'Перший постійний голос людства', vi: 'Tiếng nói vĩnh cửu đầu tiên của nhân loại', bn: 'মানবতার প্রথম স্থায়ী কণ্ঠ', fa: 'اولین صدای دائمی بشریت' },
  problem_label:{ de: 'DAS PROBLEM', en: 'THE PROBLEM', es: 'EL PROBLEMA', fr: 'LE PROBLÈME', pt: 'O PROBLEMA', ar: 'المشكلة', zh: '问题所在', ja: '問題', hi: 'समस्या', ru: 'ПРОБЛЕМА', id: 'MASALAHNYA', tr: 'SORUN', ko: '문제', it: 'IL PROBLEMA', nl: 'HET PROBLEEM', pl: 'PROBLEM', uk: 'ПРОБЛЕМА', vi: 'VẤN ĐỀ', bn: 'সমস্যা', fa: 'مشکل' },
  problem_text: { de: 'Demokratie wurde erfunden, weil sie die beste verfügbare Technologie war, um den kollektiven Willen der Menschen in Entscheidungen umzusetzen. Sie hat einen fundamentalen Fehler: Du stimmst einmal alle vier Jahre ab. Für 1.460 Tage ist deine Stimme stumm. Dein gewählter Vertreter kann alles tun, was er will — du kannst nichts dagegen tun bis zur nächsten Wahl.', en: 'Democracy was invented because it was the best available technology to translate the collective will of people into decisions. It has a fundamental flaw: you vote once every four years. For 1,460 days your voice is silent. Your elected representative can do whatever they want — you can do nothing about it until the next election.', es: 'La democracia fue inventada porque era la mejor tecnología disponible para traducir la voluntad colectiva de las personas en decisiones. Tiene un defecto fundamental: votas una vez cada cuatro años. Durante 1.460 días tu voz está en silencio.', fr: 'La démocratie a été inventée parce qu\'elle était la meilleure technologie disponible pour traduire la volonté collective des gens en décisions. Elle a un défaut fondamental : tu votes une fois tous les quatre ans. Pendant 1 460 jours, ta voix est muette.', pt: 'A democracia foi inventada porque era a melhor tecnologia disponível para traduzir a vontade coletiva das pessoas em decisões. Tem uma falha fundamental: você vota uma vez a cada quatro anos. Durante 1.460 dias sua voz fica em silêncio.', ar: 'اختُرعت الديمقراطية لأنها كانت أفضل تقنية متاحة لترجمة الإرادة الجماعية للناس إلى قرارات. لكنها تعاني من عيب جوهري: تصوّت مرة واحدة كل أربع سنوات. لـ1460 يوماً يكون صوتك صامتاً.', zh: '民主被发明出来，是因为它是将人们集体意志转化为决策的最佳技术。它有一个根本缺陷：每四年投票一次。在1460天里，你的声音是沉默的。', ja: '民主主義は、人々の集合的な意志を決定に変換するための最良の技術として発明された。根本的な欠陥がある：4年に一度しか投票できない。1,460日間、あなたの声は沈黙している。', hi: 'लोकतंत्र का आविष्कार इसलिए हुआ क्योंकि यह लोगों की सामूहिक इच्छा को निर्णयों में बदलने की सबसे अच्छी उपलब्ध तकनीक थी। इसमें एक मौलिक खामी है: आप हर चार साल में एक बार वोट करते हैं। 1,460 दिनों तक आपकी आवाज़ शांत रहती है।', ru: 'Демократия была изобретена как лучшая технология для воплощения коллективной воли людей в решения. У неё есть фундаментальный изъян: вы голосуете раз в четыре года. 1460 дней ваш голос молчит.', id: 'Demokrasi ditemukan karena itu adalah teknologi terbaik yang tersedia untuk menerjemahkan kehendak kolektif masyarakat ke dalam keputusan. Ada cacat mendasar: Anda memilih sekali setiap empat tahun. Selama 1.460 hari suara Anda diam.', tr: 'Demokrasi, insanların kolektif iradesini kararlara dönüştürmek için mevcut en iyi teknoloji olduğu için icat edildi. Temel bir kusuru var: dört yılda bir oy kullanıyorsunuz. 1.460 gün boyunca sesiniz sessiz.', ko: '민주주의는 사람들의 집단적 의지를 결정으로 전환하는 가장 좋은 기술로 발명되었습니다. 근본적인 결함이 있습니다: 4년에 한 번 투표합니다. 1,460일 동안 당신의 목소리는 침묵합니다.', it: 'La democrazia fu inventata perché era la migliore tecnologia disponibile per tradurre la volontà collettiva delle persone in decisioni. Ha un difetto fondamentale: voti una volta ogni quattro anni. Per 1.460 giorni la tua voce è silenziosa.', nl: 'Democratie werd uitgevonden omdat het de beste beschikbare technologie was om de collectieve wil van mensen in beslissingen om te zetten. Het heeft een fundamenteel gebrek: je stemt één keer per vier jaar. Gedurende 1.460 dagen is jouw stem stil.', pl: 'Demokracja została wynaleziona, ponieważ była najlepszą dostępną technologią do przekształcania zbiorowej woli ludzi w decyzje. Ma fundamentalną wadę: głosujesz raz na cztery lata. Przez 1460 dni twój głos milczy.', uk: 'Демократію було винайдено як найкращу технологію для переведення колективної волі людей у рішення. У неї є фундаментальний недолік: ти голосуєш раз на чотири роки. Протягом 1460 днів твій голос мовчить.', vi: 'Dân chủ được phát minh vì đây là công nghệ tốt nhất để chuyển ý chí tập thể của con người thành quyết định. Nó có một khiếm khuyết cơ bản: bạn bầu cử một lần mỗi bốn năm. Trong 1.460 ngày, tiếng nói của bạn im lặng.', bn: 'গণতন্ত্র আবিষ্কৃত হয়েছিল কারণ এটি মানুষের সম্মিলিত ইচ্ছাকে সিদ্ধান্তে রূপান্তরিত করার সেরা প্রযুক্তি ছিল। এর একটি মৌলিক ত্রুটি আছে: আপনি প্রতি চার বছরে একবার ভোট দেন। ১,৪৬০ দিন আপনার কণ্ঠ নীরব থাকে।', fa: 'دموکراسی اختراع شد زیرا بهترین فناوری موجود برای تبدیل اراده جمعی مردم به تصمیمات بود. اما یک نقص اساسی دارد: هر چهار سال یک بار رأی می‌دهید. برای ۱۴۶۰ روز صدای شما خاموش است.' },
  solution_label:{ de: 'DIE LÖSUNG', en: 'THE SOLUTION', es: 'LA SOLUCIÓN', fr: 'LA SOLUTION', pt: 'A SOLUÇÃO', ar: 'الحل', zh: '解决方案', ja: '解決策', hi: 'समाधान', ru: 'РЕШЕНИЕ', id: 'SOLUSINYA', tr: 'ÇÖZÜM', ko: '해결책', it: 'LA SOLUZIONE', nl: 'DE OPLOSSING', pl: 'ROZWIĄZANIE', uk: 'РІШЕННЯ', vi: 'GIẢI PHÁP', bn: 'সমাধান', fa: 'راه‌حل' },
  solution_text:{ de: 'Dein digitaler Zwilling ist eine Sammlung deiner politischen Überzeugungen — 8 Dimensionen, messbar, erklärbar, permanent. Er spricht für dich auf jede neue politische Frage, auch wenn du offline bist. Kein Algorithmus entscheidet — die Formel ist offen, jeder Schritt nachvollziehbar.', en: 'Your digital twin is a collection of your political convictions — 8 dimensions, measurable, explainable, permanent. It speaks for you on every new political question, even when you are offline. No algorithm decides — the formula is open, every step traceable.', es: 'Tu gemelo digital es una colección de tus convicciones políticas — 8 dimensiones, medible, explicable, permanente. Habla por ti sobre cada nueva pregunta política, incluso cuando estás desconectado. Ningún algoritmo decide — la fórmula es abierta, cada paso trazable.', fr: 'Ton jumeau numérique est un ensemble de tes convictions politiques — 8 dimensions, mesurable, explicable, permanent. Il parle pour toi sur chaque nouvelle question politique, même quand tu es hors ligne. Aucun algorithme ne décide — la formule est ouverte, chaque étape traçable.', pt: 'Seu gêmeo digital é uma coleção de suas convicções políticas — 8 dimensões, mensurável, explicável, permanente. Ele fala por você sobre cada nova questão política, mesmo quando você está offline. Nenhum algoritmo decide — a fórmula é aberta, cada etapa rastreável.', ar: 'توأمك الرقمي هو مجموعة من قناعاتك السياسية — 8 أبعاد، قابلة للقياس والشرح، دائمة. يتحدث عنك في كل سؤال سياسي جديد، حتى عندما تكون غير متصل. لا يقرر أي خوارزمية — الصيغة مفتوحة، كل خطوة قابلة للتتبع.', zh: '你的数字孪生是你政治信念的集合——8个维度，可测量、可解释、永久存在。它在每个新的政治问题上为你发言，即使你不在线。没有算法决定——公式是公开的，每一步都可追溯。', ja: 'あなたのデジタルツインはあなたの政治的信念の集合体だ——8つの次元、測定可能、説明可能、永久的。オフラインでも、新しいすべての政治的問題についてあなたのために語る。アルゴリズムは決定しない——公式は公開され、すべてのステップが追跡可能。', hi: 'आपका डिजिटल ट्विन आपकी राजनीतिक मान्यताओं का संग्रह है — 8 आयाम, मापनीय, व्याख्या योग्य, स्थायी। यह हर नए राजनीतिक सवाल पर आपके लिए बोलता है, यहाँ तक कि जब आप ऑफलाइन हों। कोई एल्गोरिदम तय नहीं करता — सूत्र खुला है, हर कदम ट्रेस करने योग्य।', ru: 'Ваш цифровой двойник — это набор ваших политических убеждений: 8 измерений, измеримых, объяснимых, постоянных. Он говорит за вас по каждому новому политическому вопросу, даже когда вы офлайн. Никакой алгоритм не решает — формула открыта, каждый шаг отслеживается.', id: 'Kembaran digitalmu adalah kumpulan keyakinan politikmu — 8 dimensi, terukur, dapat dijelaskan, permanen. Berbicara untukmu tentang setiap pertanyaan politik baru, bahkan saat offline. Tidak ada algoritma yang memutuskan — rumusnya terbuka, setiap langkah dapat dilacak.', tr: 'Dijital ikizin, siyasi inançlarının bir koleksiyonudur — 8 boyut, ölçülebilir, açıklanabilir, kalıcı. Çevrimdışı olduğunda bile her yeni siyasi soru için senin adına konuşur. Hiçbir algoritma karar vermez — formül açık, her adım izlenebilir.', ko: '당신의 디지털 트윈은 당신의 정치적 신념의 집합입니다 — 8가지 차원, 측정 가능하고, 설명 가능하며, 영구적입니다. 오프라인일 때도 모든 새로운 정치적 질문에 대해 당신을 위해 말합니다. 알고리즘이 결정하지 않습니다 — 공식은 공개되어 있고 모든 단계를 추적할 수 있습니다.', it: 'Il tuo gemello digitale è una raccolta delle tue convinzioni politiche — 8 dimensioni, misurabile, spiegabile, permanente. Parla per te su ogni nuova questione politica, anche quando sei offline. Nessun algoritmo decide — la formula è aperta, ogni passo tracciabile.', nl: 'Jouw digitale tweeling is een verzameling van jouw politieke overtuigingen — 8 dimensies, meetbaar, verklaarbaar, permanent. Het spreekt voor jou over elke nieuwe politieke vraag, zelfs als je offline bent. Geen algoritme beslist — de formule is open, elke stap traceerbaar.', pl: 'Twój cyfrowy bliźniak to zbiór twoich politycznych przekonań — 8 wymiarów, mierzalnych, objaśnialnych, trwałych. Mówi za ciebie w każdej nowej kwestii politycznej, nawet gdy jesteś offline. Żaden algorytm nie decyduje — formuła jest jawna, każdy krok możliwy do prześledzenia.', uk: 'Ваш цифровий двійник — це набір ваших політичних переконань: 8 вимірів, вимірюваних, пояснюваних, постійних. Він говорить за вас з кожного нового політичного питання, навіть коли ви офлайн. Жоден алгоритм не вирішує — формула відкрита, кожен крок відстежуваний.', vi: 'Sinh đôi số của bạn là tập hợp các niềm tin chính trị của bạn — 8 chiều, có thể đo lường, có thể giải thích, vĩnh cửu. Nó nói thay bạn về mọi câu hỏi chính trị mới, ngay cả khi bạn ngoại tuyến. Không có thuật toán quyết định — công thức là mở, mọi bước có thể truy xuất.', bn: 'আপনার ডিজিটাল যমজ আপনার রাজনৈতিক বিশ্বাসের সংগ্রহ — ৮টি মাত্রা, পরিমাপযোগ্য, ব্যাখ্যাযোগ্য, স্থায়ী। এটি প্রতিটি নতুন রাজনৈতিক প্রশ্নে আপনার হয়ে কথা বলে, এমনকি আপনি অফলাইনে থাকলেও। কোনো অ্যালগরিদম সিদ্ধান্ত নেয় না — সূত্রটি উন্মুক্ত, প্রতিটি পদক্ষেপ অনুসরণযোগ্য।', fa: 'دوقلوی دیجیتال شما مجموعه‌ای از باورهای سیاسی شماست — ۸ بُعد، قابل اندازه‌گیری، قابل توضیح، دائمی. در هر سوال سیاسی جدیدی برای شما صحبت می‌کند، حتی وقتی آفلاین هستید. هیچ الگوریتمی تصمیم نمی‌گیرد — فرمول باز است، هر گام قابل ردیابی.' },
  formula_label:{ de: 'DIE FORMEL', en: 'THE FORMULA', es: 'LA FÓRMULA', fr: 'LA FORMULE', pt: 'A FÓRMULA', ar: 'الصيغة', zh: '公式', ja: '数式', hi: 'सूत्र', ru: 'ФОРМУЛА', id: 'RUMUSNYA', tr: 'FORMÜL', ko: '공식', it: 'LA FORMULA', nl: 'DE FORMULE', pl: 'WZÓR', uk: 'ФОРМУЛА', vi: 'CÔNG THỨC', bn: 'সূত্র', fa: 'فرمول' },
  formula_expl: { de: 'Für jede politische Frage berechnet das System: Wenn du Klimaschutz wichtig findest (0,87) und die Frage stark vom Klimaschutz abhängt (+0,55 Gewichtung) — dann stimmst du tendenziell zu. Das Ergebnis ist eine Zahl zwischen 0 (starke Ablehnung) und 1 (starke Zustimmung).', en: 'For each political question, the system calculates: if you value climate protection highly (0.87) and the question strongly depends on climate protection (+0.55 weight) — then you tend to agree. The result is a number between 0 (strong rejection) and 1 (strong support).', es: 'Para cada pregunta política, el sistema calcula: si valoras mucho la protección climática (0,87) y la pregunta depende fuertemente de la protección climática (+0,55 peso) — entonces tiendes a estar de acuerdo. El resultado es un número entre 0 y 1.', fr: 'Pour chaque question politique, le système calcule : si tu accordes une grande importance à la protection du climat (0,87) et que la question en dépend fortement (+0,55 de poids) — alors tu as tendance à être d\'accord. Le résultat est un nombre entre 0 et 1.', pt: 'Para cada questão política, o sistema calcula: se você valoriza muito a proteção climática (0,87) e a questão depende fortemente dela (+0,55 de peso) — então você tende a concordar. O resultado é um número entre 0 e 1.', ar: 'لكل سؤال سياسي، يحسب النظام: إذا كنت تقدّر حماية المناخ عالياً (0.87) والسؤال يعتمد بشدة عليها (+0.55 وزن) — فأنت تميل إلى الموافقة. النتيجة رقم بين 0 و1.', zh: '对于每个政治问题，系统计算：如果你高度重视气候保护（0.87），而问题强烈依赖气候保护（+0.55权重）——那么你倾向于同意。结果是0到1之间的数字。', ja: '各政治的問いに対して、システムは計算する：気候保護を高く評価し（0.87）、質問が気候保護に強く依存している場合（+0.55の重み）— あなたは賛成する傾向がある。結果は0から1の数値。', hi: 'प्रत्येक राजनीतिक प्रश्न के लिए, सिस्टम गणना करता है: यदि आप जलवायु संरक्षण को उच्च मूल्य देते हैं (0.87) और प्रश्न इस पर दृढ़ता से निर्भर करता है (+0.55 भार) — तो आप सहमत होने की संभावना रखते हैं। परिणाम 0 से 1 के बीच की संख्या है।', ru: 'Для каждого политического вопроса система вычисляет: если вы высоко цените защиту климата (0,87) и вопрос сильно от неё зависит (+0,55 вес) — вы склонны согласиться. Результат — число от 0 до 1.', id: 'Untuk setiap pertanyaan politik, sistem menghitung: jika Anda sangat menghargai perlindungan iklim (0,87) dan pertanyaan sangat bergantung padanya (+0,55 bobot) — maka Anda cenderung setuju. Hasilnya adalah angka antara 0 dan 1.', tr: 'Her siyasi soru için sistem hesaplar: iklim korumayı yüksek değerliyorsanız (0,87) ve soru buna güçlü bağımlıysa (+0,55 ağırlık) — o zaman katılma eğiliminde olursunuz. Sonuç 0 ile 1 arasında bir sayıdır.', ko: '각 정치적 질문에 대해 시스템은 계산합니다: 기후 보호를 높이 평가하고(0.87) 질문이 기후 보호에 강하게 의존한다면(+0.55 가중치) — 동의하는 경향이 있습니다. 결과는 0에서 1 사이의 숫자입니다.', it: 'Per ogni domanda politica, il sistema calcola: se apprezzi molto la protezione climatica (0,87) e la domanda dipende fortemente da essa (+0,55 di peso) — allora tendi ad essere d\'accordo. Il risultato è un numero tra 0 e 1.', nl: 'Voor elke politieke vraag berekent het systeem: als je klimaatbescherming hoog waardeert (0,87) en de vraag er sterk van afhangt (+0,55 gewicht) — dan neig je ertoe het eens te zijn. Het resultaat is een getal tussen 0 en 1.', pl: 'Dla każdego pytania politycznego system oblicza: jeśli bardzo cenisz ochronę klimatu (0,87) i pytanie silnie od niej zależy (+0,55 wagi) — to masz tendencję do zgody. Wynikiem jest liczba od 0 do 1.', uk: 'Для кожного політичного питання система обчислює: якщо ви високо цінуєте захист клімату (0,87) і питання сильно від нього залежить (+0,55 вага) — ви схильні погоджуватись. Результат — число від 0 до 1.', vi: 'Đối với mỗi câu hỏi chính trị, hệ thống tính toán: nếu bạn đánh giá cao bảo vệ khí hậu (0,87) và câu hỏi phụ thuộc nhiều vào bảo vệ khí hậu (+0,55 trọng số) — thì bạn có xu hướng đồng ý. Kết quả là số từ 0 đến 1.', bn: 'প্রতিটি রাজনৈতিক প্রশ্নের জন্য, সিস্টেম গণনা করে: আপনি যদি জলবায়ু সুরক্ষাকে উচ্চ মূল্য দেন (০.৮৭) এবং প্রশ্নটি এর উপর দৃঢ়ভাবে নির্ভর করে (+০.৫৫ ওজন) — তবে আপনি সম্মত হওয়ার প্রবণতা রাখেন। ফলাফল ০ থেকে ১ এর মধ্যে একটি সংখ্যা।', fa: 'برای هر سوال سیاسی، سیستم محاسبه می‌کند: اگر حفاظت از اقلیم را ارزش‌گذاری می‌کنید (۰.۸۷) و سوال به شدت به آن وابسته است (+۰.۵۵ وزن) — پس تمایل دارید موافقت کنید. نتیجه عددی بین ۰ تا ۱ است.' },
  demo_label:   { de: 'LIVE DEMO — PROBIERE ES AUS', en: 'LIVE DEMO — TRY IT', es: 'DEMO EN VIVO — PRUÉBALO', fr: 'DÉMO EN DIRECT — ESSAIE', pt: 'DEMO AO VIVO — EXPERIMENTE', ar: 'تجربة مباشرة', zh: '现场演示', ja: 'ライブデモ', hi: 'लाइव डेमो', ru: 'ЖИВАЯ ДЕМО', id: 'DEMO LANGSUNG', tr: 'CANLI DEMO', ko: '라이브 데모', it: 'DEMO DAL VIVO', nl: 'LIVE DEMO', pl: 'DEMO NA ŻYWO', uk: 'ЖИВА ДЕМО', vi: 'DEMO TRỰC TIẾP', bn: 'লাইভ ডেমো', fa: 'دموی زنده' },
  demo_question:{ de: 'Frage: Sollte die EU bis 2035 klimaneutral werden?', en: 'Question: Should the EU become climate-neutral by 2035?', es: 'Pregunta: ¿Debería la UE ser neutral en carbono para 2035?', fr: 'Question : L\'UE devrait-elle être neutre en carbone d\'ici 2035 ?', pt: 'Pergunta: A UE deveria ser neutra em carbono até 2035?', ar: 'سؤال: هل يجب أن يصبح الاتحاد الأوروبي محايداً مناخياً بحلول 2035؟', zh: '问题：欧盟应在2035年前实现气候中和吗？', ja: '質問：EUは2035年までに気候中立を達成すべきか？', hi: 'प्रश्न: क्या EU को 2035 तक जलवायु-तटस्थ बनना चाहिए?', ru: 'Вопрос: Должен ли ЕС стать климатически нейтральным к 2035 году?', id: 'Pertanyaan: Haruskah UE menjadi netral iklim pada 2035?', tr: 'Soru: AB 2035\'e kadar iklim nötr olmalı mı?', ko: '질문: EU는 2035년까지 기후 중립을 달성해야 할까요?', it: 'Domanda: L\'UE dovrebbe diventare neutrale per il clima entro il 2035?', nl: 'Vraag: Moet de EU tegen 2035 klimaatneutraal worden?', pl: 'Pytanie: Czy UE powinna stać się neutralna klimatycznie do 2035 roku?', uk: 'Питання: Чи повинен ЄС стати кліматично нейтральним до 2035 року?', vi: 'Câu hỏi: EU có nên đạt trung hòa khí hậu vào năm 2035 không?', bn: 'প্রশ্ন: ইইউ কি ২০৩৫ সালের মধ্যে জলবায়ু-নিরপেক্ষ হওয়া উচিত?', fa: 'سؤال: آیا اتحادیه اروپا باید تا ۲۰۳۵ از نظر آب‌وهوایی خنثی شود؟' },
  demo_result:  { de: 'Ergebnis deines Zwillings:', en: 'Your twin\'s result:', es: 'Resultado de tu gemelo:', fr: 'Résultat de ton jumeau :', pt: 'Resultado do seu gêmeo:', ar: 'نتيجة توأمك:', zh: '你的孪生结果:', ja: 'あなたのツインの結果:', hi: 'तुम्हारे ट्विन का परिणाम:', ru: 'Результат твоего двойника:', id: 'Hasil kembaranmu:', tr: 'İkizinin sonucu:', ko: '당신의 트윈 결과:', it: 'Il risultato del tuo gemello:', nl: 'Het resultaat van jouw tweeling:', pl: 'Wynik twojego bliźniaka:', uk: 'Результат твого двійника:', vi: 'Kết quả sinh đôi của bạn:', bn: 'তোমার যমজের ফলাফল:', fa: 'نتیجه دوقلوی تو:' },
  demo_supports:{ de: 'DAFÜR', en: 'SUPPORTS', es: 'A FAVOR', fr: 'POUR', pt: 'A FAVOR', ar: 'يؤيد', zh: '支持', ja: '支持', hi: 'पक्ष में', ru: 'ЗА', id: 'MENDUKUNG', tr: 'DESTEK', ko: '찬성', it: 'FAVOREVOLE', nl: 'STEUNT', pl: 'ZA', uk: 'ЗА', vi: 'ỦNG HỘ', bn: 'সমর্থন', fa: 'موافق' },
  demo_opposes: { de: 'DAGEGEN', en: 'OPPOSES', es: 'EN CONTRA', fr: 'CONTRE', pt: 'CONTRA', ar: 'يعارض', zh: '反对', ja: '反対', hi: 'विरोध में', ru: 'ПРОТИВ', id: 'MENOLAK', tr: 'KARŞI', ko: '반대', it: 'CONTRARIO', nl: 'TEGEN', pl: 'PRZECIW', uk: 'ПРОТИ', vi: 'PHẢN ĐỐI', bn: 'বিরোধিতা', fa: 'مخالف' },
  nostr_label:  { de: 'WARUM NOSTR', en: 'WHY NOSTR', es: 'POR QUÉ NOSTR', fr: 'POURQUOI NOSTR', pt: 'POR QUE NOSTR', ar: 'لماذا نوستر', zh: '为什么用Nostr', ja: 'なぜNostrか', hi: 'नोस्ट्र क्यों', ru: 'ПОЧЕМУ NOSTR', id: 'MENGAPA NOSTR', tr: 'NEDEN NOSTR', ko: '왜 Nostr인가', it: 'PERCHÉ NOSTR', nl: 'WAAROM NOSTR', pl: 'DLACZEGO NOSTR', uk: 'ЧОМУ NOSTR', vi: 'TẠI SAO NOSTR', bn: 'কেন Nostr', fa: 'چرا Nostr' },
  nostr_text:   { de: 'Nostr ist ein offenes, dezentrales Protokoll — wie E-Mail, aber zensurresistent. Dein Zwilling wird als kryptografisch signiertes Event gespeichert. Niemand kann es löschen. Niemand kann es fälschen. Der private Schlüssel liegt nur bei dir.', en: 'Nostr is an open, decentralized protocol — like email, but censorship-resistant. Your twin is stored as a cryptographically signed event. No one can delete it. No one can forge it. The private key exists only with you.', es: 'Nostr es un protocolo abierto y descentralizado — como el correo electrónico, pero resistente a la censura. Tu gemelo se almacena como un evento firmado criptográficamente. Nadie puede eliminarlo. Nadie puede falsificarlo. La clave privada sólo existe contigo.', fr: 'Nostr est un protocole ouvert et décentralisé — comme l\'e-mail, mais résistant à la censure. Ton jumeau est stocké comme un événement signé cryptographiquement. Personne ne peut le supprimer. Personne ne peut le falsifier. La clé privée n\'existe qu\'avec toi.', pt: 'Nostr é um protocolo aberto e descentralizado — como e-mail, mas resistente à censura. Seu gêmeo é armazenado como um evento assinado criptograficamente. Ninguém pode apagá-lo. Ninguém pode falsificá-lo. A chave privada existe apenas com você.', ar: 'Nostr هو بروتوكول مفتوح ولامركزي — مثل البريد الإلكتروني، لكن مقاوم للرقابة. يُخزَّن توأمك كحدث موقّع تشفيرياً. لا يمكن لأحد حذفه. لا يمكن لأحد تزويره. المفتاح الخاص موجود معك فقط.', zh: 'Nostr是一个开放的、去中心化的协议——像电子邮件，但抗审查。你的孪生被存储为加密签名的事件。没有人可以删除它。没有人可以伪造它。私钥只在你手中。', ja: 'Nostrはオープンで分散型のプロトコルだ——メールのようだが、検閲耐性がある。あなたのツインは暗号学的に署名されたイベントとして保存される。誰も削除できない。誰も偽造できない。秘密鍵はあなただけにある。', hi: 'Nostr एक खुला, विकेंद्रीकृत प्रोटोकॉल है — ईमेल की तरह, लेकिन सेंसरशिप-प्रतिरोधी। आपका ट्विन क्रिप्टोग्राफिक रूप से हस्ताक्षरित इवेंट के रूप में संग्रहीत है। कोई इसे हटा नहीं सकता। कोई इसे जाली नहीं बना सकता। निजी कुंजी केवल आपके पास है।', ru: 'Nostr — открытый децентрализованный протокол, как электронная почта, но устойчивый к цензуре. Ваш двойник хранится как криптографически подписанное событие. Никто не может его удалить. Никто не может его подделать. Приватный ключ только у вас.', id: 'Nostr adalah protokol terbuka dan terdesentralisasi — seperti email, tetapi tahan sensor. Kembaranmu disimpan sebagai event yang ditandatangani secara kriptografis. Tidak ada yang bisa menghapusnya. Tidak ada yang bisa memalsunya. Kunci privat hanya ada padamu.', tr: 'Nostr, açık ve merkeziyetsiz bir protokoldür — e-posta gibi, ancak sansüre dayanıklı. İkizin kriptografik olarak imzalanmış bir etkinlik olarak depolanır. Kimse onu silemez. Kimse onu sahte yapamaz. Özel anahtar yalnızca sende.', ko: 'Nostr는 개방적이고 분산된 프로토콜입니다 — 이메일처럼, 하지만 검열에 강합니다. 당신의 트윈은 암호학적으로 서명된 이벤트로 저장됩니다. 아무도 삭제할 수 없습니다. 아무도 위조할 수 없습니다. 개인 키는 당신에게만 있습니다.', it: 'Nostr è un protocollo aperto e decentralizzato — come l\'email, ma resistente alla censura. Il tuo gemello è memorizzato come evento firmato crittograficamente. Nessuno può eliminarlo. Nessuno può falsificarlo. La chiave privata esiste solo con te.', nl: 'Nostr is een open, gedecentraliseerd protocol — zoals e-mail, maar censuurbestendig. Jouw tweeling is opgeslagen als een cryptografisch ondertekende gebeurtenis. Niemand kan het verwijderen. Niemand kan het vervalsen. De privésleutel bestaat alleen bij jou.', pl: 'Nostr to otwarty, zdecentralizowany protokół — jak e-mail, ale odporny na cenzurę. Twój bliźniak jest przechowywany jako kryptograficznie podpisane zdarzenie. Nikt nie może tego usunąć. Nikt nie może tego sfałszować. Klucz prywatny istnieje tylko u ciebie.', uk: 'Nostr — відкритий децентралізований протокол, як електронна пошта, але стійкий до цензури. Ваш двійник зберігається як криптографічно підписана подія. Ніхто не може її видалити. Ніхто не може її підробити. Приватний ключ лише у вас.', vi: 'Nostr là một giao thức mở, phi tập trung — như email, nhưng chống kiểm duyệt. Sinh đôi của bạn được lưu trữ như một sự kiện được ký mật mã. Không ai có thể xóa nó. Không ai có thể giả mạo nó. Khóa riêng chỉ tồn tại với bạn.', bn: 'Nostr একটি উন্মুক্ত, বিকেন্দ্রীভূত প্রোটোকল — ইমেইলের মতো, কিন্তু সেন্সরশিপ-প্রতিরোধী। আপনার যমজ ক্রিপ্টোগ্রাফিকভাবে স্বাক্ষরিত ইভেন্ট হিসেবে সংরক্ষিত। কেউ এটি মুছতে পারে না। কেউ এটি জাল করতে পারে না। প্রাইভেট কী শুধু আপনার কাছে আছে।', fa: 'Nostr یک پروتکل باز و غیرمتمرکز است — مانند ایمیل، اما مقاوم در برابر سانسور. دوقلوی شما به عنوان یک رویداد امضا شده رمزنگاری ذخیره می‌شود. هیچ‌کس نمی‌تواند آن را حذف کند. هیچ‌کس نمی‌تواند آن را جعل کند. کلید خصوصی فقط نزد شماست.' },
  cta:          { de: 'Zwilling erstellen', en: 'Create Twin', es: 'Crear Gemelo', fr: 'Créer Jumeau', pt: 'Criar Gêmeo', ar: 'إنشاء توأم', zh: '创建孪生', ja: 'ツインを作成', hi: 'जुड़वां बनाएं', ru: 'Создать двойника', id: 'Buat Kembaran', tr: 'İkiz Oluştur', ko: '트윈 만들기', it: 'Crea Gemello', nl: 'Tweeling maken', pl: 'Utwórz bliźniaka', uk: 'Створити двійника', vi: 'Tạo sinh đôi', bn: 'যমজ তৈরি করুন', fa: 'دوقلو ایجاد کنید' },
};

function tx(lang: string, key: keyof typeof TX): string {
  const m = TX[key] as Record<string, string>;
  return m[lang] ?? m['en'];
}

// Question: EU climate neutral 2035 — weights: klimaschutz:+0.55, wirtschaft:-0.30, europa:+0.15
const DEMO_WEIGHTS = { klimaschutz: 0.55, wirtschaft: -0.30, europa: 0.15 } as const;

const TOPIC_NAMES: Record<string, Record<string, string>> = {
  klimaschutz: { de: 'Klimaschutz', en: 'Climate', es: 'Clima', fr: 'Climat', pt: 'Clima', ar: 'المناخ', zh: '气候', ja: '気候', hi: 'जलवायु', ru: 'Климат', id: 'Iklim', tr: 'İklim', ko: '기후', it: 'Clima', nl: 'Klimaat', pl: 'Klimat', uk: 'Клімат', vi: 'Khí hậu', bn: 'জলবায়ু', fa: 'آب‌وهوا' },
  sozialstaat: { de: 'Sozialstaat', en: 'Welfare', es: 'Estado Social', fr: 'État Social', pt: 'Estado Social', ar: 'الرعاية', zh: '福利', ja: '福祉', hi: 'कल्याण', ru: 'Соцзащита', id: 'Sosial', tr: 'Sosyal Devlet', ko: '복지', it: 'Welfare', nl: 'Sociale Staat', pl: 'Państwo Socjalne', uk: 'Соцдержава', vi: 'Phúc lợi', bn: 'সামাজিক রাষ্ট্র', fa: 'رفاه اجتماعی' },
  wirtschaft:  { de: 'Wirtschaft', en: 'Market', es: 'Mercado', fr: 'Marché', pt: 'Mercado', ar: 'الاقتصاد', zh: '市场', ja: '市場', hi: 'बाज़ार', ru: 'Рынок', id: 'Pasar', tr: 'Piyasa', ko: '시장', it: 'Mercato', nl: 'Markt', pl: 'Rynek', uk: 'Ринок', vi: 'Thị trường', bn: 'বাজার', fa: 'بازار' },
  bildung:     { de: 'Bildung', en: 'Education', es: 'Educación', fr: 'Éducation', pt: 'Educação', ar: 'التعليم', zh: '教育', ja: '教育', hi: 'शिक्षा', ru: 'Образование', id: 'Pendidikan', tr: 'Eğitim', ko: '교육', it: 'Istruzione', nl: 'Onderwijs', pl: 'Edukacja', uk: 'Освіта', vi: 'Giáo dục', bn: 'শিক্ষা', fa: 'آموزش' },
  gesundheit:  { de: 'Gesundheit', en: 'Health', es: 'Salud', fr: 'Santé', pt: 'Saúde', ar: 'الصحة', zh: '健康', ja: '健康', hi: 'स्वास्थ्य', ru: 'Здоровье', id: 'Kesehatan', tr: 'Sağlık', ko: '건강', it: 'Salute', nl: 'Gezondheid', pl: 'Zdrowie', uk: 'Здоров\'я', vi: 'Sức khỏe', bn: 'স্বাস্থ্য', fa: 'بهداشت' },
  migration:   { de: 'Migration', en: 'Migration', es: 'Migración', fr: 'Migration', pt: 'Migração', ar: 'الهجرة', zh: '移民', ja: '移民', hi: 'प्रवासन', ru: 'Миграция', id: 'Migrasi', tr: 'Göç', ko: '이민', it: 'Migrazione', nl: 'Migratie', pl: 'Migracja', uk: 'Міграція', vi: 'Di cư', bn: 'অভিবাসন', fa: 'مهاجرت' },
  freiheit:    { de: 'Freiheit', en: 'Freedom', es: 'Libertad', fr: 'Liberté', pt: 'Liberdade', ar: 'الحرية', zh: '自由', ja: '自由', hi: 'स्वतंत्रता', ru: 'Свобода', id: 'Kebebasan', tr: 'Özgürlük', ko: '자유', it: 'Libertà', nl: 'Vrijheid', pl: 'Wolność', uk: 'Свобода', vi: 'Tự do', bn: 'স্বাধীনতা', fa: 'آزادی' },
  europa:      { de: 'Europa', en: 'Europe', es: 'Europa', fr: 'Europe', pt: 'Europa', ar: 'أوروبا', zh: '欧洲', ja: 'ヨーロッパ', hi: 'यूरोप', ru: 'Европа', id: 'Eropa', tr: 'Avrupa', ko: '유럽', it: 'Europa', nl: 'Europa', pl: 'Europa', uk: 'Європа', vi: 'Châu Âu', bn: 'ইউরোপ', fa: 'اروپا' },
};

const ALL_TOPICS = ['klimaschutz', 'sozialstaat', 'wirtschaft', 'bildung', 'gesundheit', 'migration', 'freiheit', 'europa'] as const;

export default function AboutPage() {
  const { lang } = useLang();
  const [demoValues, setDemoValues] = useState<Record<string, number>>({
    klimaschutz: 65, sozialstaat: 60, wirtschaft: 45, bildung: 70,
    gesundheit: 65, migration: 45, freiheit: 60, europa: 55,
  });

  const demoScore = 0.5 + Object.entries(DEMO_WEIGHTS).reduce((sum, [topic, weight]) => {
    return sum + (demoValues[topic] / 100 - 0.5) * weight;
  }, 0);
  const demoScorePct = Math.round(Math.max(0, Math.min(1, demoScore)) * 100);
  const demoSupports = demoScore >= 0.5;

  return (
    <div style={{ padding: 'clamp(80px, 10vw, 120px) 0 clamp(60px, 8vw, 100px)' }}>
      <div className="container" style={{ maxWidth: '800px' }}>

        {/* Header */}
        <p className="label" style={{ marginBottom: '28px' }}>{tx(lang, 'label')}</p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '80px', lineHeight: 1.1 }}>
          {tx(lang, 'title')}
        </h1>

        {/* Problem */}
        <div style={{ marginBottom: '72px', paddingBottom: '72px', borderBottom: '1px solid var(--divider)' }}>
          <p className="label" style={{ marginBottom: '24px' }}>{tx(lang, 'problem_label')}</p>
          <p style={{ fontSize: '17px', lineHeight: 1.9, color: 'var(--text-2)' }}>
            {tx(lang, 'problem_text')}
          </p>
        </div>

        {/* Solution */}
        <div style={{ marginBottom: '72px', paddingBottom: '72px', borderBottom: '1px solid var(--divider)' }}>
          <p className="label" style={{ marginBottom: '24px' }}>{tx(lang, 'solution_label')}</p>
          <p style={{ fontSize: '17px', lineHeight: 1.9, color: 'var(--text-2)' }}>
            {tx(lang, 'solution_text')}
          </p>
        </div>

        {/* Formula */}
        <div style={{ marginBottom: '72px', paddingBottom: '72px', borderBottom: '1px solid var(--divider)' }}>
          <p className="label" style={{ marginBottom: '24px' }}>{tx(lang, 'formula_label')}</p>
          <p style={{ fontSize: '17px', lineHeight: 1.9, color: 'var(--text-2)', marginBottom: '32px' }}>
            {tx(lang, 'formula_expl')}
          </p>
          {/* Formula block */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: '28px 32px',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'var(--text-2)',
            lineHeight: 2,
          }}>
            <div style={{ color: 'var(--text-3)', marginBottom: '8px', fontSize: '11px', letterSpacing: '0.06em' }}>INFERENCE ENGINE</div>
            <div>score = 0.5 + <span style={{ color: 'var(--accent)' }}>Σ</span> (twin[topic] − 0.5) × weight[topic]</div>
            <div style={{ marginTop: '16px', color: 'var(--text-3)', fontSize: '11px' }}>
              score &gt; 0.5 → support &nbsp;·&nbsp; score &lt; 0.5 → oppose &nbsp;·&nbsp; |weight| ≤ 1
            </div>
          </div>
        </div>

        {/* Formula Demo */}
        <div style={{ marginBottom: '72px', paddingBottom: '72px', borderBottom: '1px solid var(--divider)' }}>
          <p className="label" style={{ marginBottom: '24px' }}>{tx(lang, 'demo_label')}</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-2)', marginBottom: '32px', lineHeight: 1.7, background: 'var(--surface)', padding: '16px 20px', border: '1px solid var(--border)' }}>
            {tx(lang, 'demo_question')}
          </p>

          {/* 8 sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
            {ALL_TOPICS.map(topic => {
              const weight = (DEMO_WEIGHTS as Record<string, number>)[topic] ?? 0;
              const val = demoValues[topic];
              const contribution = (val / 100 - 0.5) * weight;
              const label = (TOPIC_NAMES[topic] as Record<string, string>)[lang] ?? topic;
              return (
                <div key={topic}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-2)' }}>
                      {label}
                    </span>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {weight !== 0 && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: '10px',
                          color: contribution >= 0 ? 'var(--positive)' : 'var(--negative)',
                          background: contribution >= 0 ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                          padding: '2px 6px', border: `1px solid ${contribution >= 0 ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                        }}>
                          {contribution >= 0 ? '+' : ''}{(contribution * 100).toFixed(1)}
                        </span>
                      )}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', minWidth: '32px', textAlign: 'right' }}>
                        {val}%
                      </span>
                    </div>
                  </div>
                  <input
                    type="range" min={0} max={100} step={1} value={val}
                    onChange={e => setDemoValues(prev => ({ ...prev, [topic]: Number(e.target.value) }))}
                    className="spectrum-slider"
                    aria-label={label}
                  />
                </div>
              );
            })}
          </div>

          {/* Live result */}
          <div style={{
            background: demoSupports ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)',
            border: `1px solid ${demoSupports ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '36px',
              fontWeight: 700,
              color: demoSupports ? 'var(--positive)' : 'var(--negative)',
              minWidth: '70px',
            }}>
              {demoScorePct}%
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', color: demoSupports ? 'var(--positive)' : 'var(--negative)', marginBottom: '4px' }}>
                {tx(lang, demoSupports ? 'demo_supports' : 'demo_opposes')}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                {tx(lang, 'demo_result')} score = 0.5 + Σ contribution
              </p>
            </div>
          </div>
        </div>

        {/* Nostr */}
        <div style={{ marginBottom: '80px' }}>
          <p className="label" style={{ marginBottom: '24px' }}>{tx(lang, 'nostr_label')}</p>
          <p style={{ fontSize: '17px', lineHeight: 1.9, color: 'var(--text-2)' }}>
            {tx(lang, 'nostr_text')}
          </p>
        </div>

        {/* CTA */}
        <Link href="/training" style={{
          display: 'inline-block',
          background: 'var(--text-1)',
          color: 'var(--bg)',
          padding: '14px 32px',
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          {tx(lang, 'cta')} →
        </Link>

      </div>
    </div>
  );
}
