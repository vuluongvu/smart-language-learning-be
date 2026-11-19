import {
  UnitReadingListening,
  UnitStudyGuide,
  UnitVocabWord,
  UnitWritingPrompt,
} from '../entities/learning-path-unit.entity.js';
import { LearningGoalBand } from '../dto/learning-path.dto.js';
import { ENGLISH_STARTER_A0_TRACK } from './starter-english.catalog.js';

export interface SeedUnitSpec {
  unitNumber: number;
  slug: string;
  title: string;
  topicName: string;
  icon: string;
  themeColor: string;
  grammarFocus: string;
  studyGuide?: UnitStudyGuide;
  vocabulary: UnitVocabWord[];
  readingListening: UnitReadingListening;
  writing: UnitWritingPrompt;
  speakingTopicPrompt: string;
}

export interface SeedPartSpec {
  partNumber: number;
  title: string;
  subtitle: string;
  units: SeedUnitSpec[];
}

export interface SeedTrackSpec {
  code: LearningGoalBand;
  title: string;
  cefrLevel: string;
  languageCode: string;
  summary: string;
  parts: SeedPartSpec[];
}

function w(
  term: string,
  pronunciation: string,
  partOfSpeech: string,
  definition: string,
  example: string,
  notes: string,
): UnitVocabWord {
  return { term, pronunciation, partOfSpeech, definition, example, notes };
}

export const LEARNING_PATH_CATALOG: SeedTrackSpec[] = [
  ENGLISH_STARTER_A0_TRACK,
  {
    code: 'band_45_55',
    title: 'Band 4.5–5.5',
    cefrLevel: 'B1',
    languageCode: 'en',
    summary:
      'Xây nền tảng giao tiếp đời sống hằng ngày, phản xạ Nghe–Nói–Đọc–Viết mạch lạc với ngữ pháp và từ vựng cốt lõi.',
    parts: [
      {
        partNumber: 1,
        title: 'My Everyday World',
        subtitle:
          'Chủ đề sinh hoạt quen thuộc: nhà cửa, thói quen, giải trí, ăn uống và mua sắm',
        units: [
          {
            unitNumber: 1,
            slug: 'where-do-you-live',
            title: 'Where Do You Live?',
            topicName: 'Neighborhood & Home',
            icon: 'home',
            themeColor: 'green',
            grammarFocus:
              'Present simple, there is / there are & prepositions of place',
            vocabulary: [
              w(
                'neighborhood',
                '/ˈneɪbərhʊd/',
                'noun',
                'khu phố, vùng lân cận',
                'My neighborhood is quiet and safe at night.',
                'Dùng "in my neighborhood" khi nói về khu vực bạn sống.',
              ),
              w(
                'cozy',
                '/ˈkoʊzi/',
                'adjective',
                'ấm cúng, thoải mái',
                'We live in a small but cozy apartment.',
                'Thường dùng khen phòng, quán cà phê hoặc ngôi nhà nhỏ.',
              ),
              w(
                'convenient',
                '/kənˈviːniənt/',
                'adjective',
                'thuận tiện, tiện lợi',
                'Living near a bus stop is very convenient.',
                'Cấu trúc hay dùng: convenient for + V-ing / noun.',
              ),
              w(
                'balcony',
                '/ˈbælkəni/',
                'noun',
                'ban công',
                'I love drinking coffee on the balcony every morning.',
                'Nhớ dùng giới từ "on the balcony".',
              ),
              w(
                'public transport',
                '/ˈpʌblɪk ˈtrænspɔːrt/',
                'noun',
                'phương tiện giao thông công cộng',
                'Public transport in this district is easy to use.',
                'Không đếm được, không thêm "s".',
              ),
              w(
                'suburb',
                '/ˈsʌbɜːrb/',
                'noun',
                'vùng ngoại ô',
                'Many families prefer living in a peaceful suburb.',
                'Dùng "in the suburbs" để chỉ khu ngoại ô nói chung.',
              ),
            ],
            readingListening: {
              title: 'Linh talks about her apartment in Da Nang',
              audioScript:
                'Hi, I am Linh. I live in a cozy two-bedroom apartment in a quiet neighborhood in Da Nang. There is a small balcony with green plants where I read books after work. My area is very convenient because there is a market across the street and good public transport nearby. Sometimes I miss the city center, yet I really enjoy living slightly in the suburbs.',
              translation:
                'Xin chào, mình là Linh. Mình sống trong một căn hộ hai phòng ngủ ấm cúng ở một khu phố yên tĩnh tại Đà Nẵng. Có một ban công nhỏ trồng cây xanh nơi mình đọc sách sau giờ làm. Khu mình rất tiện lợi vì có chợ đối diện đường và giao thông công cộng tốt gần đó. Đôi lúc mình nhớ trung tâm thành phố, nhưng mình vẫn rất thích sống ở vùng ngoại ô một chút.',
              questions: [
                {
                  id: 'u1-q1',
                  prompt: 'How does Linh describe her apartment?',
                  options: [
                    'Large and noisy',
                    'Small and expensive',
                    'Cozy with two bedrooms',
                  ],
                  correctIndex: 2,
                  explanation:
                    'Trong bài Linh nói: "I live in a cozy two-bedroom apartment".',
                },
                {
                  id: 'u1-q2',
                  prompt: 'Why is her neighborhood convenient?',
                  options: [
                    'There is a market and public transport nearby',
                    'Her office is inside the building',
                    'She has a huge garden',
                  ],
                  correctIndex: 0,
                  explanation:
                    '"convenient" vì có chợ đối diện đường và public transport gần đó.',
                },
                {
                  id: 'u1-q3',
                  prompt: 'Where does she read books after work?',
                  options: [
                    'In the living room',
                    'On the balcony',
                    'At the market',
                  ],
                  correctIndex: 1,
                  explanation:
                    'Bài nhắc tới "a small balcony ... where I read books after work".',
                },
              ],
            },
            writing: {
              prompt:
                'Describe your home and neighborhood in 3–5 sentences. Mention what makes it cozy or convenient.',
              minSentences: 3,
              targetBand: 'Band 4.5–5.5',
              targetTerms: ['neighborhood', 'cozy', 'convenient', 'balcony'],
              sampleAnswer:
                'I live in a cozy apartment in a friendly neighborhood in Ho Chi Minh City. There is a small balcony where I grow some plants. My area is quite convenient because supermarkets and bus stops are just five minutes away.',
            },
            speakingTopicPrompt:
              'Describe your home, apartment, or neighborhood and what you like most about living there',
          },
          {
            unitNumber: 2,
            slug: 'a-day-in-my-life',
            title: 'A Day in My Life',
            topicName: 'Daily Routine',
            icon: 'clock',
            themeColor: 'cream',
            grammarFocus:
              'Adverbs of frequency & time sequencers (usually, rarely, after that)',
            vocabulary: [
              w(
                'routine',
                '/ruːˈtiːn/',
                'noun',
                'thói quen sinh hoạt hằng ngày',
                'My morning routine helps me stay focused.',
                'Collocation: daily routine / stick to a routine.',
              ),
              w(
                'commute',
                '/kəˈmjuːt/',
                'verb',
                'di chuyển đi làm / đi học hằng ngày',
                'I commute to work by motorbike every weekday.',
                'Vừa làm động từ (commute to) vừa làm danh từ (a short commute).',
              ),
              w(
                'productive',
                '/prəˈdʌktɪv/',
                'adjective',
                'năng suất, hiệu quả',
                'I feel most productive between 8 a.m. and noon.',
                'Trái nghĩa: unproductive.',
              ),
              w(
                'take a break',
                '/teɪk ə breɪk/',
                'phrase',
                'nghỉ giải lao ngắn',
                'I always take a break for ten minutes after studying.',
                'Dùng "take a short break" rất tự nhiên khi nói.',
              ),
              w(
                'catch up on',
                '/kætʃ ʌp ɑːn/',
                'phrase',
                'bù lại, cập nhật việc còn tồn',
                'On Sunday mornings, I catch up on sleep and reading.',
                'Hay đi với sleep, work, emails, news.',
              ),
              w(
                'wind down',
                '/waɪnd daʊn/',
                'phrase',
                'thư giãn trước khi kết thúc ngày',
                'Listening to calm music helps me wind down before bed.',
                'Dùng cho buổi tối sau giờ làm/học.',
              ),
            ],
            readingListening: {
              title: 'Minh shares his weekday schedule',
              audioScript:
                'On weekdays, I wake up at 6:30 and follow a simple morning routine. After a quick breakfast, I commute to my office in twenty minutes. The morning is my most productive time, so I finish important tasks first. At 3 p.m., I take a break with a cup of tea. In the evening, I go jogging and wind down by reading for half an hour.',
              translation:
                'Vào các ngày trong tuần, mình dậy lúc 6h30 và làm theo thói quen buổi sáng đơn giản. Sau bữa sáng nhanh, mình đi làm mất 20 phút. Buổi sáng là lúc mình làm việc năng suất nhất nên mình xử lý việc quan trọng trước. Lúc 3 giờ chiều mình nghỉ giải lao uống trà. Buổi tối mình chạy bộ và thư giãn bằng cách đọc sách nửa tiếng.',
              questions: [
                {
                  id: 'u2-q1',
                  prompt: 'How long does it take Minh to commute to work?',
                  options: ['10 minutes', '20 minutes', '30 minutes'],
                  correctIndex: 1,
                  explanation: '"I commute to my office in twenty minutes."',
                },
                {
                  id: 'u2-q2',
                  prompt: 'When is Minh most productive?',
                  options: ['In the morning', 'At 3 p.m.', 'Late at night'],
                  correctIndex: 0,
                  explanation: '"The morning is my most productive time".',
                },
                {
                  id: 'u2-q3',
                  prompt: 'How does he wind down in the evening?',
                  options: [
                    'Checking emails',
                    'Watching movies',
                    'Reading for 30 minutes',
                  ],
                  correctIndex: 2,
                  explanation: '"wind down by reading for half an hour".',
                },
              ],
            },
            writing: {
              prompt:
                'Write 3–5 sentences about your typical weekday routine from morning to night.',
              minSentences: 3,
              targetBand: 'Band 4.5–5.5',
              targetTerms: ['routine', 'commute', 'productive', 'wind down'],
              sampleAnswer:
                'My daily routine starts at seven when I make coffee and check my plan. I commute to school by bus and study during my most productive hours in the morning. In the evening, I take a break from screens and wind down with music.',
            },
            speakingTopicPrompt:
              'Talk about your daily routine, when you feel most productive, and how you relax in the evening',
          },
          {
            unitNumber: 3,
            slug: 'what-do-you-do-for-fun',
            title: 'What Do You Do for Fun?',
            topicName: 'Hobbies & Leisure',
            icon: 'sparkles',
            themeColor: 'lavender',
            grammarFocus:
              'Verb + V-ing (enjoy, prefer, spend time doing) & frequency phrases',
            vocabulary: [
              w(
                'hang out',
                '/hæŋ aʊt/',
                'phrase',
                'tụ tập, đi chơi cùng bạn bè',
                'We usually hang out at a coffee shop on Saturdays.',
                'Cụm động từ giao tiếp cực kỳ phổ biến.',
              ),
              w(
                'recharge',
                '/ˌriːˈtʃɑːrdʒ/',
                'verb',
                'nạp lại năng lượng',
                'Spending Sunday at home helps me recharge after a busy week.',
                'Hay dùng: recharge my batteries.',
              ),
              w(
                'board game',
                '/ˈbɔːrd ɡeɪm/',
                'noun',
                'trò chơi bàn cờ / giải trí nhóm',
                'Playing board games is a fun way to bond with friends.',
                'Dùng số nhiều "board games" khi nói sở thích chung.',
              ),
              w(
                'outdoor',
                '/ˈaʊtdɔːr/',
                'adjective',
                'ngoài trời',
                'Cycling and hiking are my favorite outdoor activities.',
                'Đứng trước danh từ (outdoor sports). Còn "outdoors" là trạng từ.',
              ),
              w(
                'keen on',
                '/kiːn ɑːn/',
                'phrase',
                'hứng thú, thích làm gì',
                'I am really keen on photography and cooking.',
                'Cấu trúc ghi điểm: be keen on + noun / V-ing.',
              ),
              w(
                'unwind',
                '/ˌʌnˈwaɪnd/',
                'verb',
                'xả hơi, thư giãn',
                'Playing the guitar helps me unwind in the evening.',
                'Đồng nghĩa hay của relax ở Band 5.0–5.5.',
              ),
            ],
            readingListening: {
              title: 'Weekend hobbies with friends',
              audioScript:
                'I am quite keen on outdoor activities, especially cycling around the lake on Saturday mornings. It clears my mind and helps me recharge for the coming week. In the afternoon, my friends and I often hang out at a cafe and play board games together. Whenever it rains, I stay inside and watch a good film to unwind.',
              translation:
                'Mình khá thích các hoạt động ngoài trời, đặc biệt là đạp xe quanh hồ vào sáng thứ Bảy. Việc đó giúp đầu óc nhẹ nhàng và nạp lại năng lượng cho tuần mới. Buổi chiều mình hay tụ tập với bạn ở quán cà phê chơi board game. Hễ trời mưa thì mình ở nhà xem phim hay để thư giãn.',
              questions: [
                {
                  id: 'u3-q1',
                  prompt:
                    'What outdoor activity does the speaker enjoy on Saturday mornings?',
                  options: [
                    'Swimming',
                    'Cycling around the lake',
                    'Playing football',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"especially cycling around the lake on Saturday mornings".',
                },
                {
                  id: 'u3-q2',
                  prompt: 'What do the speaker and friends do at the cafe?',
                  options: ['Study grammar', 'Play board games', 'Cook dinner'],
                  correctIndex: 1,
                  explanation:
                    '"hang out at a cafe and play board games together".',
                },
                {
                  id: 'u3-q3',
                  prompt: 'What does "recharge" mean in this passage?',
                  options: [
                    'Pay for electricity',
                    'Buy a new phone',
                    'Get fresh energy again',
                  ],
                  correctIndex: 2,
                  explanation:
                    '"recharge" nghĩa là nạp lại năng lượng tinh thần/thể chất.',
                },
              ],
            },
            writing: {
              prompt:
                'Write 3–5 sentences about your favorite free-time hobbies and why you enjoy them.',
              minSentences: 3,
              targetBand: 'Band 4.5–5.5',
              targetTerms: ['hang out', 'keen on', 'recharge', 'unwind'],
              sampleAnswer:
                'In my free time, I am very keen on playing badminton because it keeps me active. On weekends, I often hang out with close friends for coffee to unwind. These hobbies help me recharge before Monday comes.',
            },
            speakingTopicPrompt:
              'Talk about your hobbies, weekend activities, and what helps you recharge',
          },
          {
            unitNumber: 4,
            slug: 'lets-eat',
            title: "Let's Eat!",
            topicName: 'Food & Dining Out',
            icon: 'utensils',
            themeColor: 'pink',
            grammarFocus:
              'Countable / uncountable nouns & polite requests (Could I have...?)',
            vocabulary: [
              w(
                'specialty',
                '/ˈspeʃəlti/',
                'noun',
                'món đặc sản',
                'Pho and bun cha are famous local specialties.',
                'Có thể nói: local specialty / house specialty.',
              ),
              w(
                'flavorful',
                '/ˈfleɪvərfəl/',
                'adjective',
                'đậm đà hương vị',
                'The broth was rich, warm, and very flavorful.',
                'Hay dùng thay cho "delicious" để tránh lặp từ.',
              ),
              w(
                'appetizer',
                '/ˈæpɪtaɪzər/',
                'noun',
                'món khai vị',
                'We ordered fresh spring rolls as an appetizer.',
                'Món chính là "main course", tráng miệng là "dessert".',
              ),
              w(
                'portion',
                '/ˈpɔːrʃən/',
                'noun',
                'khẩu phần ăn',
                'The portions at this restaurant are really generous.',
                'Đi với tính từ: generous portion / small portion.',
              ),
              w(
                'street food',
                '/striːt fuːd/',
                'noun',
                'đồ ăn đường phố',
                'Vietnamese street food is affordable and delicious.',
                'Không đếm được.',
              ),
              w(
                'grab a bite',
                '/ɡræb ə baɪt/',
                'phrase',
                'ăn nhẹ / ăn nhanh bữa gì đó',
                'Let us grab a bite near the office before the meeting.',
                'Cụm tự nhiên thay cho "eat something quickly".',
              ),
            ],
            readingListening: {
              title: 'Ordering dinner at a local restaurant',
              audioScript:
                'Last Friday, my cousin and I decided to grab a bite at a cozy family restaurant near the river. First, we shared crispy spring rolls as an appetizer. Then I ordered a grilled fish dish, which is their local specialty. Everything tasted fresh and flavorful, and the portions were surprisingly generous for the price.',
              translation:
                'Thứ Sáu tuần trước, mình và anh họ quyết định đi ăn nhanh tại một nhà hàng gia đình ấm cúng gần sông. Đầu tiên bọn mình gọi chung gỏi cuốn giòn làm món khai vị. Sau đó mình gọi cá nướng là món đặc sản của quán. Mọi thứ đều tươi và đậm đà, khẩu phần lại khá nhiều so với giá tiền.',
              questions: [
                {
                  id: 'u4-q1',
                  prompt: 'What did they order as an appetizer?',
                  options: [
                    'Grilled fish',
                    'Crispy spring rolls',
                    'Noodle soup',
                  ],
                  correctIndex: 1,
                  explanation: '"shared crispy spring rolls as an appetizer".',
                },
                {
                  id: 'u4-q2',
                  prompt: 'How were the portions at the restaurant?',
                  options: ['Too tiny', 'Surprisingly generous', 'Very cold'],
                  correctIndex: 1,
                  explanation:
                    '"the portions were surprisingly generous for the price".',
                },
                {
                  id: 'u4-q3',
                  prompt: 'Which word describes food with strong good taste?',
                  options: ['flavorful', 'portion', 'bill'],
                  correctIndex: 0,
                  explanation: '"flavorful" nghĩa là đậm đà, nhiều hương vị.',
                },
              ],
            },
            writing: {
              prompt:
                'Describe your favorite dish or a nice meal you had recently in 3–5 sentences.',
              minSentences: 3,
              targetBand: 'Band 4.5–5.5',
              targetTerms: ['specialty', 'flavorful', 'street food', 'portion'],
              sampleAnswer:
                'My favorite local specialty is beef noodle soup because the broth is hot and flavorful. I often eat it at a small street food stall near my house. A single bowl has a generous portion and keeps me full all morning.',
            },
            speakingTopicPrompt:
              'Talk about your favorite Vietnamese food, street food, or dining out with friends',
          },
          {
            unitNumber: 5,
            slug: 'shopping-day',
            title: 'Shopping Day',
            topicName: 'Shopping & Smart Choices',
            icon: 'shopping-bag',
            themeColor: 'cream',
            grammarFocus:
              'Comparatives & shopping expressions (on sale, try on, receipt)',
            vocabulary: [
              w(
                'reasonable',
                '/ˈriːzənəbl/',
                'adjective',
                'hợp lý, phải chăng (về giá)',
                'The prices at that local shop are quite reasonable.',
                'Dùng với giá: a reasonable price.',
              ),
              w(
                'bargain',
                '/ˈbɑːrɡən/',
                'noun',
                'món hời (mua được giá rẻ)',
                'I bought this jacket for half price—it was a real bargain!',
                'Cụm hay dùng: find a bargain / a real bargain.',
              ),
              w(
                'try on',
                '/traɪ ɑːn/',
                'phrase',
                'mặc thử (quần áo, giày dép)',
                'Could I try on these sneakers in size 41?',
                'Có thể tách giữa try và on: try it on.',
              ),
              w(
                'durable',
                '/ˈdʊrəbl/',
                'adjective',
                'bền bỉ, dùng lâu',
                'I prefer buying durable shoes rather than cheap ones.',
                'Nâng band tốt thay cho "strong / long-lasting".',
              ),
              w(
                'refund',
                '/ˈriːfʌnd/',
                'noun',
                'khoản hoàn tiền',
                'Please keep your receipt in case you need a refund.',
                'Collocation: ask for a refund / get a refund.',
              ),
              w(
                'browse',
                '/braʊz/',
                'verb',
                'dạo xem hàng / lướt xem',
                'Sometimes I just browse clothes online without buying anything.',
                'Rất hợp tả thói quen window shopping.',
              ),
            ],
            readingListening: {
              title: 'Finding a bargain at the weekend market',
              audioScript:
                'I usually prefer shopping in stores because I want to try on clothes before paying. Yesterday I went to the mall just to browse, yet I found a durable backpack on sale. Its price was very reasonable, so it felt like a great bargain. The cashier also reminded me to keep the receipt in case I needed an exchange or refund.',
              translation:
                'Mình thường thích đi mua trực tiếp vì muốn mặc thử đồ trước khi trả tiền. Hôm qua mình vào trung tâm thương mại chỉ để đi dạo xem, nhưng lại tìm thấy một chiếc ba lô bền đang giảm giá. Giá rất hợp lý nên đúng là một món hời. Thu ngân còn nhắc mình giữ hóa đơn phòng khi cần đổi hoặc hoàn tiền.',
              questions: [
                {
                  id: 'u5-q1',
                  prompt:
                    'Why does the speaker prefer shopping in physical stores?',
                  options: [
                    'To try on clothes before paying',
                    'Stores are always open 24 hours',
                    'Delivery is slower online',
                  ],
                  correctIndex: 0,
                  explanation:
                    '"because I want to try on clothes before paying".',
                },
                {
                  id: 'u5-q2',
                  prompt: 'Why should the speaker keep the receipt?',
                  options: [
                    'To get free snacks',
                    'In case of an exchange or refund',
                    'To enter the parking lot',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"keep the receipt in case I needed an exchange or refund".',
                },
                {
                  id: 'u5-q3',
                  prompt: 'What did the speaker buy?',
                  options: [
                    'A cheap pair of glasses',
                    'A winter coat',
                    'A durable backpack on sale',
                  ],
                  correctIndex: 2,
                  explanation: '"I found a durable backpack on sale".',
                },
              ],
            },
            writing: {
              prompt:
                'Write 3–5 sentences comparing online shopping vs going to stores, and share one smart purchase you made.',
              minSentences: 3,
              targetBand: 'Band 4.5–5.5',
              targetTerms: ['reasonable', 'bargain', 'try on', 'durable'],
              sampleAnswer:
                'I enjoy browsing online because it saves time, although I still go to stores to try on shoes. Last month I found a durable pair of running shoes at a very reasonable price. Waiting for weekend discounts often helps me get a real bargain.',
            },
            speakingTopicPrompt:
              'Compare shopping online vs in physical stores and talk about a good bargain you bought',
          },
        ],
      },
      {
        partNumber: 2,
        title: 'People Around Me',
        subtitle:
          'Mở rộng giao tiếp về gia đình, bạn bè, công việc học tập và di chuyển',
        units: [
          {
            unitNumber: 6,
            slug: 'family-and-friends',
            title: 'Family & Friends',
            topicName: 'Relationships & Personality',
            icon: 'users',
            themeColor: 'lavender',
            grammarFocus:
              'Relative clauses (who, that) & personality adjectives',
            vocabulary: [
              w(
                'get along with',
                '/ɡet əˈlɔːŋ wɪð/',
                'phrase',
                'hòa thuận, hợp với ai đó',
                'I get along well with my younger sister.',
                'Hay dùng thêm trạng từ: get along really well with.',
              ),
              w(
                'supportive',
                '/səˈpɔːrtɪv/',
                'adjective',
                'hay ủng hộ, động viên',
                'My best friend is always supportive when I feel stressed.',
                'Dùng với người: supportive parents / friend.',
              ),
              w(
                'easygoing',
                '/ˌiːziˈɡoʊɪŋ/',
                'adjective',
                'dễ tính, thoải mái',
                'He is an easygoing person who rarely gets angry.',
                'Tính từ mô tả tính cách ăn điểm cao.',
              ),
              w(
                'sense of humor',
                '/sens əv ˈhjuːmər/',
                'phrase',
                'khiếu hài hước',
                'I love friends who have a great sense of humor.',
                'Động từ đi kèm: have a good sense of humor.',
              ),
              w(
                'look up to',
                '/lʊk ʌp tuː/',
                'phrase',
                'kính trọng, ngưỡng mộ',
                'I really look up to my older brother for his patience.',
                'Ngược nghĩa: look down on.',
              ),
              w(
                'reliable',
                '/rɪˈlaɪəbl/',
                'adjective',
                'đáng tin cậy',
                'She is a reliable teammate who always finishes on time.',
                'Danh từ: reliability.',
              ),
            ],
            readingListening: {
              title: 'Someone I admire in my family',
              audioScript:
                'The person I look up to most is my older sister, Hoa. She is very easygoing and has a great sense of humor, so everyone gets along well with her. Whenever I face a tough exam, she is always supportive and gives calm advice. To me, she is the most reliable person I know.',
              translation:
                'Người mình ngưỡng mộ nhất là chị gái Hoa. Chị rất dễ tính và có khiếu hài hước nên ai cũng hòa hợp với chị. Mỗi khi mình gặp kỳ thi khó, chị luôn ủng hộ và cho lời khuyên bình tĩnh. Với mình, chị là người đáng tin cậy nhất.',
              questions: [
                {
                  id: 'u6-q1',
                  prompt: 'Why does everyone get along with Hoa?',
                  options: [
                    'Because she gives people money',
                    'Because she is easygoing with a great sense of humor',
                    'Because she lives nearby',
                  ],
                  correctIndex: 1,
                  explanation:
                    'Bài nhắc tới "She is very easygoing and has a great sense of humor".',
                },
                {
                  id: 'u6-q2',
                  prompt: 'When does Hoa support the speaker?',
                  options: [
                    'Before tough exams',
                    'Only on holidays',
                    'During basketball games',
                  ],
                  correctIndex: 0,
                  explanation:
                    '"Whenever I face a tough exam, she is always supportive".',
                },
                {
                  id: 'u6-q3',
                  prompt: 'What does "look up to" mean?',
                  options: [
                    'Ignore someone',
                    'Admire and respect someone',
                    'Wait for someone',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"look up to" có nghĩa là ngưỡng mộ, kính trọng.',
                },
              ],
            },
            writing: {
              prompt:
                'Describe a close friend or family member you admire in 3–5 sentences.',
              minSentences: 3,
              targetBand: 'Band 4.5–5.5',
              targetTerms: [
                'supportive',
                'easygoing',
                'reliable',
                'get along with',
              ],
              sampleAnswer:
                'I have a close friend named Tuan whom I get along with very well. He is an easygoing guy who always brings positive energy to our group. Whenever I need help, Tuan is reliable and genuinely supportive.',
            },
            speakingTopicPrompt:
              'Describe a close friend or family member, their personality, and why you get along well',
          },
          {
            unitNumber: 7,
            slug: 'study-and-work',
            title: 'Study & Work',
            topicName: 'Career & Learning Goals',
            icon: 'briefcase',
            themeColor: 'green',
            grammarFocus:
              'Present continuous for current goals vs future plans (plan to, hope to)',
            vocabulary: [
              w(
                'deadline',
                '/ˈdedlaɪn/',
                'noun',
                'hạn chót hoàn thành',
                'I try to finish my assignments before the deadline.',
                'Động từ đi kèm: meet a deadline / miss a deadline.',
              ),
              w(
                'collaborate',
                '/kəˈlæbəreɪt/',
                'verb',
                'hợp tác, làm việc nhóm',
                'Our team collaborates closely with designers on every project.',
                'Cấu trúc: collaborate with + người + on + việc.',
              ),
              w(
                'skill set',
                '/skɪl set/',
                'noun',
                'bộ kỹ năng',
                'Learning English improves your professional skill set.',
                'Dùng khi nói định hướng nghề nghiệp.',
              ),
              w(
                'challenging',
                '/ˈtʃælɪndʒɪŋ/',
                'adjective',
                'nhiều thử thách nhưng thú vị',
                'Working on real client projects can be challenging yet rewarding.',
                'Tích cực hơn từ "difficult".',
              ),
              w(
                'motivate',
                '/ˈmoʊtɪveɪt/',
                'verb',
                'tạo động lực',
                'Clear goals motivate me to study twenty minutes every day.',
                'Cấu trúc: motivate someone to V.',
              ),
              w(
                'gain experience',
                '/ɡeɪn ɪkˈspɪriəns/',
                'phrase',
                'tích lũy kinh nghiệm',
                'An internship helps students gain practical experience.',
                'Không thêm "s" vào "experience".',
              ),
            ],
            readingListening: {
              title: 'Growing skills through teamwork',
              audioScript:
                'Currently, I am taking an evening course to upgrade my skill set for work. Our instructor gives challenging tasks with tight deadlines, which motivates me to manage time better. I also enjoy collaborating with classmates from different fields because it helps me gain fresh experience.',
              translation:
                'Hiện tại mình đang học một khóa buổi tối để nâng cấp bộ kỹ năng cho công việc. Giảng viên giao các bài tập thử thách với hạn chót sát sao, điều này tạo động lực để mình quản lý thời gian tốt hơn. Mình cũng thích hợp tác với bạn học nhiều ngành vì giúp tích lũy trải nghiệm mới.',
              questions: [
                {
                  id: 'u7-q1',
                  prompt: 'Why is the speaker taking an evening course?',
                  options: [
                    'To upgrade their skill set',
                    'To meet neighbors',
                    'To pass a driving test',
                  ],
                  correctIndex: 0,
                  explanation:
                    '"taking an evening course to upgrade my skill set for work".',
                },
                {
                  id: 'u7-q2',
                  prompt: 'What motivates the speaker to manage time better?',
                  options: [
                    'Free gifts',
                    'Challenging tasks with tight deadlines',
                    'Long vacations',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"challenging tasks with tight deadlines, which motivates me...".',
                },
                {
                  id: 'u7-q3',
                  prompt:
                    'What benefit comes from collaborating with classmates?',
                  options: [
                    'Less homework',
                    'Higher salary immediately',
                    'Gaining fresh experience',
                  ],
                  correctIndex: 2,
                  explanation:
                    '"collaborating with classmates ... helps me gain fresh experience".',
                },
              ],
            },
            writing: {
              prompt:
                'Write 3–5 sentences about your current study or work and one skill you want to improve.',
              minSentences: 3,
              targetBand: 'Band 4.5–5.5',
              targetTerms: [
                'deadline',
                'collaborate',
                'challenging',
                'motivate',
              ],
              sampleAnswer:
                'Right now I am working on software projects where I collaborate with teammates every day. Meeting tight deadlines can be challenging, yet it motivates me to stay organized. I also practice speaking English to build a stronger skill set.',
            },
            speakingTopicPrompt:
              'Talk about your current work or studies, teamwork, and what keeps you motivated',
          },
        ],
      },
    ],
  },
  {
    code: 'band_55_65',
    title: 'Band 5.5–6.5',
    cefrLevel: 'B2',
    languageCode: 'en',
    summary:
      'Phát triển vốn từ vựng học thuật–công sở, cấu trúc câu phức và lập luận tự tin cho mục tiêu Band 6.5 / B2.',
    parts: [
      {
        partNumber: 1,
        title: 'Modern Life & Technology',
        subtitle: 'Cân bằng công việc, công nghệ số và lối sống lành mạnh',
        units: [
          {
            unitNumber: 1,
            slug: 'work-life-balance',
            title: 'Work-Life Balance',
            topicName: 'Career & Wellbeing',
            icon: 'scale',
            themeColor: 'lavender',
            grammarFocus:
              'Present perfect continuous & modals of advice (ought to, should)',
            vocabulary: [
              w(
                'burnout',
                '/ˈbɜːrnaʊt/',
                'noun',
                'tình trạng kiệt sức vì công việc',
                'Working overtime every week can quickly lead to burnout.',
                'Collocation: prevent burnout / experience burnout.',
              ),
              w(
                'flexible schedule',
                '/ˈfleksəbl ˈskedʒuːl/',
                'phrase',
                'lịch làm việc linh hoạt',
                'A flexible schedule allows employees to balance family life.',
                'Cụm ăn điểm chủ đề Work.',
              ),
              w(
                'set boundaries',
                '/set ˈbaʊndriz/',
                'phrase',
                'đặt ra ranh giới rõ ràng',
                'Remote workers need to set boundaries between work and rest.',
                'Rất hợp văn phong Band 6.0+.',
              ),
              w(
                'overwhelmed',
                '/ˌoʊvərˈwelmd/',
                'adjective',
                'choáng ngợp, quá tải',
                'I felt overwhelmed when three projects arrived at once.',
                'Dùng "feel overwhelmed by...".',
              ),
              w(
                'prioritize',
                '/praɪˈɔːrətaɪz/',
                'verb',
                'sắp xếp thứ tự ưu tiên',
                'Learning to prioritize urgent tasks saves hours every week.',
                'Động từ rất mạnh trong IELTS Speaking/Writing.',
              ),
              w(
                'sustainable',
                '/səˈsteɪnəbl/',
                'adjective',
                'bền vững, duy trì được lâu dài',
                'Sleeping seven hours a night is key to a sustainable pace.',
                'Dùng cho cả môi trường và thói quen.',
              ),
            ],
            readingListening: {
              title: 'Preventing burnout in remote work',
              audioScript:
                'Remote work offers a flexible schedule, which sounds ideal at first. However, many professionals have been working late without noticing, eventually feeling overwhelmed and close to burnout. Experts advise employees to set boundaries—such as logging off by 6 p.m.—and prioritize rest so their career growth stays sustainable.',
              translation:
                'Làm việc từ xa mang lại lịch trình linh hoạt, thoạt nghe rất lý tưởng. Tuy nhiên nhiều người làm việc muộn mà không hay biết, dẫn đến quá tải và kiệt sức. Chuyên gia khuyên nhân viên đặt ranh giới — như tắt máy lúc 6 giờ chiều — và ưu tiên nghỉ ngơi để phát triển sự nghiệp bền vững.',
              questions: [
                {
                  id: 'b6u1-q1',
                  prompt:
                    'What risk do remote workers face without boundaries?',
                  options: [
                    'Long commutes',
                    'Feeling overwhelmed and burnout',
                    'Too many vacations',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"eventually feeling overwhelmed and close to burnout".',
                },
                {
                  id: 'b6u1-q2',
                  prompt:
                    'What is one practical way to set boundaries mentioned in the audio?',
                  options: [
                    'Logging off by 6 p.m.',
                    'Changing jobs monthly',
                    'Avoiding teamwork',
                  ],
                  correctIndex: 0,
                  explanation: '"such as logging off by 6 p.m.".',
                },
                {
                  id: 'b6u1-q3',
                  prompt: 'Why should workers prioritize rest?',
                  options: [
                    'To stay sustainable long term',
                    'To skip deadlines',
                    'To use more devices',
                  ],
                  correctIndex: 0,
                  explanation:
                    '"prioritize rest so their career growth stays sustainable".',
                },
              ],
            },
            writing: {
              prompt:
                'Write 4–6 sentences discussing how people can maintain a healthy work-life balance today.',
              minSentences: 4,
              targetBand: 'Band 5.5–6.5',
              targetTerms: [
                'burnout',
                'flexible schedule',
                'set boundaries',
                'prioritize',
              ],
              sampleAnswer:
                'Although a flexible schedule helps employees manage personal errands, blurred hours often trigger burnout. To stay healthy, workers ought to set clear boundaries after office hours and avoid checking work messages late at night. Furthermore, learning to prioritize high-impact tasks prevents people from feeling overwhelmed.',
            },
            speakingTopicPrompt:
              'Discuss work-life balance, remote work challenges, and how you avoid burnout',
          },
          {
            unitNumber: 2,
            slug: 'tech-in-daily-life',
            title: 'Tech in Daily Life',
            topicName: 'Digital Habits & AI',
            icon: 'cpu',
            themeColor: 'green',
            grammarFocus:
              'Cause & effect linkers (consequently, lead to, as a result)',
            vocabulary: [
              w(
                'rely on',
                '/rɪˈlaɪ ɑːn/',
                'phrase',
                'phụ thuộc vào, dựa vào',
                'Students increasingly rely on digital tools to organize notes.',
                'Tránh lạm dụng "depend on" bằng "rely heavily on".',
              ),
              w(
                'streamline',
                '/ˈstriːmlaɪn/',
                'verb',
                'tinh gọn, tối ưu hóa quy trình',
                'Automation helps small businesses streamline daily tasks.',
                'Từ vựng Band 6.5 rất tự nhiên.',
              ),
              w(
                'distraction',
                '/dɪˈstrækʃən/',
                'noun',
                'sự xao nhãng',
                'Constant phone notifications are a major distraction while studying.',
                'Đếm được: a distraction / distractions.',
              ),
              w(
                'privacy concern',
                '/ˈpraɪvəsi kənˈsɜːrn/',
                'phrase',
                'lo ngại về quyền riêng tư',
                'Smart apps raise serious privacy concerns about personal data.',
                'Hay dùng: raise privacy concerns.',
              ),
              w(
                'digital detox',
                '/ˈdɪdʒɪtl ˈdiːtɑːks/',
                'noun',
                'cai thiết bị số tạm thời',
                'Doing a weekend digital detox improves sleep quality.',
                'Cụm hiện đại rất hợp IELTS Speaking.',
              ),
              w(
                'indispensable',
                '/ˌɪndɪˈspensəbl/',
                'adjective',
                'không thể thiếu',
                'Cloud storage has become an indispensable tool for teamwork.',
                'Nâng cấp cho "very important / necessary".',
              ),
            ],
            readingListening: {
              title: 'Convenience vs distraction in the smart era',
              audioScript:
                'Smartphones and AI assistants have become indispensable because they streamline communication and information search. Consequently, we rely on them for almost every daily task. On the downside, nonstop alerts create constant distractions and privacy concerns, motivating many people to schedule a weekly digital detox.',
              translation:
                'Điện thoại thông minh và trợ lý AI trở nên không thể thiếu vì giúp tối ưu hóa giao tiếp và tìm kiếm thông tin. Hệ quả là chúng ta phụ thuộc vào chúng cho hầu hết mọi việc hằng ngày. Mặt trái là thông báo liên tục gây xao nhãng và lo ngại riêng tư, thúc đẩy nhiều người lên lịch cai thiết bị số mỗi tuần.',
              questions: [
                {
                  id: 'b6u2-q1',
                  prompt: 'Why are smart tools described as indispensable?',
                  options: [
                    'They replace all human jobs',
                    'They streamline communication and search',
                    'They are completely free forever',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"because they streamline communication and information search".',
                },
                {
                  id: 'b6u2-q2',
                  prompt: 'What are two drawbacks mentioned in the talk?',
                  options: [
                    'High weight and slow batteries',
                    'Expensive screens and heavy cables',
                    'Constant distractions and privacy concerns',
                  ],
                  correctIndex: 2,
                  explanation:
                    '"nonstop alerts create constant distractions and privacy concerns".',
                },
                {
                  id: 'b6u2-q3',
                  prompt: 'How do some users deal with those drawbacks?',
                  options: [
                    'Schedule a weekly digital detox',
                    'Buy two phones',
                    'Turn up notification volume',
                  ],
                  correctIndex: 0,
                  explanation:
                    '"motivating many people to schedule a weekly digital detox".',
                },
              ],
            },
            writing: {
              prompt:
                'Write 4–6 sentences evaluating one major benefit and one drawback of smartphones or AI tools.',
              minSentences: 4,
              targetBand: 'Band 5.5–6.5',
              targetTerms: [
                'indispensable',
                'streamline',
                'distraction',
                'rely on',
              ],
              sampleAnswer:
                'Digital apps have become indispensable for students because they streamline research and vocabulary review. As a result, learners rely on mobile platforms to study anywhere. However, social media notifications are a constant distraction, so users must manage screen time carefully.',
            },
            speakingTopicPrompt:
              'Talk about how technology streamlines your life and whether people rely too much on devices',
          },
          {
            unitNumber: 3,
            slug: 'green-living',
            title: 'Green Living',
            topicName: 'Environment & Habits',
            icon: 'globe',
            themeColor: 'cream',
            grammarFocus:
              'Passive voice & concessive clauses (although, despite + V-ing)',
            vocabulary: [
              w(
                'single-use plastic',
                '/ˌsɪŋɡl juːs ˈplæstɪk/',
                'phrase',
                'nhựa dùng một lần',
                'Reducing single-use plastic starts with carrying a reusable bottle.',
                'Chủ đề Environment kinh điển.',
              ),
              w(
                'carbon footprint',
                '/ˈkɑːrbən ˈfʊtprɪnt/',
                'noun',
                'lượng khí thải carbon cá nhân',
                'Choosing trains over short flights shrinks your carbon footprint.',
                'Động từ đi kèm: reduce / shrink / lower.',
              ),
              w(
                'eco-friendly',
                '/ˌiːkoʊ ˈfrendli/',
                'adjective',
                'thân thiện với môi trường',
                'Consumers increasingly prefer eco-friendly packaging.',
                'Viết có dấu gạch nối.',
              ),
              w(
                'conserve',
                '/kənˈsɜːrv/',
                'verb',
                'tiết kiệm, bảo tồn',
                'Smart meters encourage households to conserve electricity and water.',
                'Dùng với energy, water, resources.',
              ),
              w(
                'raise awareness',
                '/reɪz əˈwernəs/',
                'phrase',
                'nâng cao nhận thức',
                'Community cleanups help raise public awareness about waste.',
                'Cấu trúc: raise awareness of/about + N.',
              ),
              w(
                'incentive',
                '/ɪnˈsentɪv/',
                'noun',
                'chính sách khuyến khích / động lực',
                'Tax incentives encourage factories to switch to clean energy.',
                'Financial incentive / government incentive.',
              ),
            ],
            readingListening: {
              title: 'Small daily habits for greener cities',
              audioScript:
                'Despite busy urban schedules, small habits make a measurable impact on the environment. When single-use plastics are replaced with eco-friendly containers, neighborhood waste drops noticeably. Governments can also conserve resources at scale by offering financial incentives for solar power and public transit.',
              translation:
                'Dù lịch trình đô thị bận rộn, những thói quen nhỏ vẫn tạo tác động đo lường được với môi trường. Khi nhựa dùng một lần được thay bằng hộp đựng thân thiện môi trường, rác thải khu phố giảm rõ rệt. Chính phủ cũng có thể tiết kiệm tài nguyên ở quy mô lớn bằng các ưu đãi tài chính cho điện mặt trời và giao thông công cộng.',
              questions: [
                {
                  id: 'b6u3-q1',
                  prompt: 'What happens when single-use plastics are replaced?',
                  options: [
                    'Prices double immediately',
                    'Neighborhood waste drops noticeably',
                    'Public transit stops',
                  ],
                  correctIndex: 1,
                  explanation: '"neighborhood waste drops noticeably".',
                },
                {
                  id: 'b6u3-q2',
                  prompt:
                    'How can governments encourage solar power and public transit?',
                  options: [
                    'By offering financial incentives',
                    'By banning bicycles',
                    'By closing local parks',
                  ],
                  correctIndex: 0,
                  explanation:
                    '"by offering financial incentives for solar power and public transit".',
                },
                {
                  id: 'b6u3-q3',
                  prompt: 'What does "conserve" mean here?',
                  options: ['Waste quickly', 'Save and protect', 'Manufacture'],
                  correctIndex: 1,
                  explanation:
                    '"conserve resources" = tiết kiệm và bảo vệ tài nguyên.',
                },
              ],
            },
            writing: {
              prompt:
                'Write 4–6 sentences explaining what individuals and governments can do to reduce waste.',
              minSentences: 4,
              targetBand: 'Band 5.5–6.5',
              targetTerms: [
                'single-use plastic',
                'eco-friendly',
                'conserve',
                'incentive',
              ],
              sampleAnswer:
                'Individuals can cut waste effectively by avoiding single-use plastic and bringing eco-friendly bags to shops. Additionally, turning off unused lights helps households conserve energy and reduce their carbon footprint. At the same time, government incentives for recycling make green choices easier for everyone.',
            },
            speakingTopicPrompt:
              'Talk about green habits in daily life and how cities can encourage eco-friendly living',
          },
        ],
      },
    ],
  },
  {
    code: 'band_65_75',
    title: 'Band 6.5–7.5+',
    cefrLevel: 'C1',
    languageCode: 'en',
    summary:
      'Làm chủ từ vựng chính xác, sắc thái diễn đạt tự nhiên và tư duy lập luận chặt chẽ cho mục tiêu Band 7.0–7.5+ / C1.',
    parts: [
      {
        partNumber: 1,
        title: 'Critical Discussion & Fluency',
        subtitle:
          'Phân tích các chủ đề xã hội, đô thị hóa và tương lai nghề nghiệp với AI',
        units: [
          {
            unitNumber: 1,
            slug: 'urban-transformation',
            title: 'Urban Transformation',
            topicName: 'Cities & Housing',
            icon: 'building',
            themeColor: 'pink',
            grammarFocus: 'Participle clauses & formal lexical collocations',
            vocabulary: [
              w(
                'infrastructure',
                '/ˈɪnfrəstrʌktʃər/',
                'noun',
                'cơ sở hạ tầng',
                'Rapid urbanization often strains public infrastructure.',
                'Không đếm được.',
              ),
              w(
                'gentrification',
                '/ˌdʒentrɪfɪˈkeɪʃən/',
                'noun',
                'quá trình đô thị hóa đẩy giá nhà tăng cao',
                'Gentrification can modernize districts while pricing out long-term residents.',
                'Từ vựng C1 cực đắt giá cho IELTS.',
              ),
              w(
                'congestion',
                '/kənˈdʒestʃən/',
                'noun',
                'tắc nghẽn (giao thông)',
                'Expanding metro lines is essential to ease traffic congestion.',
                'Collocation: ease / alleviate traffic congestion.',
              ),
              w(
                'livability',
                '/ˌlɪvəˈbɪləti/',
                'noun',
                'chất lượng đáng sống của đô thị',
                'Green spaces dramatically enhance urban livability.',
                'Từ gia đình: livable city.',
              ),
              w(
                'pedestrianize',
                '/pəˈdestriənaɪz/',
                'verb',
                'quy hoạch thành phố đi bộ',
                'Pedestrianizing historic streets boosts small retail shops.',
                'Dùng khi bàn chính sách giao thông đô thị.',
              ),
              w(
                'stark contrast',
                '/stɑːrk ˈkɑːntræst/',
                'phrase',
                'sự tương phản rõ rệt',
                'There is a stark contrast between inner-city towers and rural towns.',
                'Nâng tầm "big difference".',
              ),
            ],
            readingListening: {
              title: 'Balancing rapid growth and urban livability',
              audioScript:
                'Faced with rapid population growth, modern megacities struggle to upgrade infrastructure fast enough to prevent traffic congestion. While shiny districts attract investment, unchecked gentrification creates a stark contrast in housing affordability. Forward-looking planners now pedestrianize central streets and preserve green belts to protect long-term livability.',
              translation:
                'Đối mặt với tăng dân số nhanh, các siêu đô thị hiện đại chật vật nâng cấp hạ tầng đủ nhanh để tránh ùn tắc giao thông. Trong khi các khu mới hào nhoáng thu hút đầu tư, tình trạng tăng giá khu dân cư mất kiểm soát tạo ra sự tương phản rõ rệt về khả năng chi trả nhà ở. Các nhà quy hoạch tiến bộ hiện mở rộng phố đi bộ trung tâm và giữ vành đai xanh để bảo vệ chất lượng sống lâu dài.',
              questions: [
                {
                  id: 'b7u1-q1',
                  prompt: 'What tension arises from unchecked gentrification?',
                  options: [
                    'Fewer shopping streets',
                    'A stark contrast in housing affordability',
                    'Decline in investment everywhere',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"creates a stark contrast in housing affordability".',
                },
                {
                  id: 'b7u1-q2',
                  prompt: 'What policies protect long-term urban livability?',
                  options: [
                    'Pedestrianizing central streets and preserving green belts',
                    'Removing metro stations',
                    'Building only highways',
                  ],
                  correctIndex: 0,
                  explanation:
                    '"pedestrianize central streets and preserve green belts".',
                },
                {
                  id: 'b7u1-q3',
                  prompt: 'Which collocation means reducing traffic jams?',
                  options: [
                    'boost congestion',
                    'ease traffic congestion',
                    'ignore infrastructure',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"ease traffic congestion" là collocation chuẩn Band 7+.',
                },
              ],
            },
            writing: {
              prompt:
                'Write a cohesive 5–7 sentence paragraph analyzing how cities can modernize without sacrificing livability.',
              minSentences: 5,
              targetBand: 'Band 6.5–7.5',
              targetTerms: [
                'infrastructure',
                'congestion',
                'livability',
                'pedestrianize',
              ],
              sampleAnswer:
                'Rapid urban expansion frequently outpaces transport infrastructure, resulting in severe traffic congestion. To protect urban livability, city planners should invest in reliable rail networks rather than widening roads indefinitely. Moreover, pedestrianizing crowded central neighborhoods reduces noise pollution while supporting local businesses. Although redevelopment brings modern facilities, authorities must guard against extreme gentrification through affordable housing quotas.',
            },
            speakingTopicPrompt:
              'Analyze how rapid urbanization affects infrastructure, housing affordability, and city livability',
          },
          {
            unitNumber: 2,
            slug: 'ai-and-future-work',
            title: 'AI & the Future of Work',
            topicName: 'Innovation & Careers',
            icon: 'sparkles',
            themeColor: 'lavender',
            grammarFocus:
              'Hedging claims (arguably, to a large extent) & cleft sentences',
            vocabulary: [
              w(
                'augment',
                '/ɔːɡˈment/',
                'verb',
                'tăng cường, bổ trợ năng lực',
                'AI tools should augment human judgment rather than replace accountability.',
                'Khác với "replace": augment = nâng lực cho con người.',
              ),
              w(
                'obsolete',
                '/ˌɑːbsəˈliːt/',
                'adjective',
                'lỗi thời, không còn được dùng',
                'Repetitive clerical roles risk becoming obsolete within a decade.',
                'Collocation: become obsolete / render obsolete.',
              ),
              w(
                'upskilling',
                '/ˈʌpskɪlɪŋ/',
                'noun',
                'nâng cao kỹ năng nghề nghiệp',
                'Continuous upskilling helps engineers adapt to rapid technological shifts.',
                'Danh từ C1 chủ đề Workforce.',
              ),
              w(
                'nuanced',
                '/ˈnuːɑːnst/',
                'adjective',
                'sâu sắc, có sắc thái tinh tế',
                'Human mentors provide nuanced feedback tailored to emotional context.',
                'Dùng thay cho "detailed / complex".',
              ),
              w(
                'mitigate',
                '/ˈmɪtɪɡeɪt/',
                'verb',
                'giảm thiểu tác động tiêu cực',
                'Public training subsidies help mitigate job displacement.',
                'Collocation: mitigate risks / mitigate the impact.',
              ),
              w(
                'double-edged sword',
                '/ˌdʌbl edʒd ˈsɔːrd/',
                'phrase',
                'con dao hai lưỡi',
                'Automation acts as a double-edged sword for entry-level hiring.',
                'Thành ngữ học thuật dùng hợp cả Speaking & Writing.',
              ),
            ],
            readingListening: {
              title: 'Augmentation vs replacement in the AI workplace',
              audioScript:
                'Artificial intelligence is arguably a double-edged sword for the modern workforce. On one hand, smart tools augment creativity and eliminate repetitive busywork; on the other, routine roles risk becoming obsolete. To mitigate disruption, companies must invest in structured upskilling while cultivating nuanced human skills like empathy and ethical decision-making.',
              translation:
                'Trí tuệ nhân tạo có thể nói là con dao hai lưỡi với lực lượng lao động hiện đại. Một mặt, công cụ thông minh bổ trợ năng lực sáng tạo và loại bỏ việc lặp lại nhàm chán; mặt khác, các công việc rập khuôn có nguy cơ trở nên lỗi thời. Để giảm thiểu xáo trộn, doanh nghiệp cần đầu tư tái đào tạo kỹ năng bài bản đồng thời nuôi dưỡng các kỹ năng tinh tế của con người như thấu cảm và ra quyết định đạo đức.',
              questions: [
                {
                  id: 'b7u2-q1',
                  prompt:
                    'What is the positive role of AI described by the speaker?',
                  options: [
                    'Eliminating all teamwork',
                    'Augmenting creativity and removing repetitive busywork',
                    'Making upskilling unnecessary',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"smart tools augment creativity and eliminate repetitive busywork".',
                },
                {
                  id: 'b7u2-q2',
                  prompt: 'How can companies mitigate job disruption?',
                  options: [
                    'Invest in structured upskilling and nuanced human skills',
                    'Forbid employees from learning tech',
                    'Ignore routine roles',
                  ],
                  correctIndex: 0,
                  explanation:
                    '"invest in structured upskilling while cultivating nuanced human skills".',
                },
                {
                  id: 'b7u2-q3',
                  prompt: 'What does "double-edged sword" mean?',
                  options: [
                    'Something with both clear benefits and serious risks',
                    'A traditional weapon only',
                    'A guaranteed profit tool',
                  ],
                  correctIndex: 0,
                  explanation:
                    '"double-edged sword" = con dao hai lưỡi (vừa lợi vừa hại).',
                },
              ],
            },
            writing: {
              prompt:
                'Write a balanced 5–7 sentence response examining whether AI will primarily augment or replace human jobs.',
              minSentences: 5,
              targetBand: 'Band 6.5–7.5',
              targetTerms: ['augment', 'obsolete', 'upskilling', 'mitigate'],
              sampleAnswer:
                'To a large extent, artificial intelligence serves as a tool that augments professional output rather than wholly replacing human expertise. While repetitive administrative duties are increasingly rendered obsolete, roles demanding nuanced judgment and interpersonal trust remain vital. What determines smooth adaptation is consistent upskilling across both schools and workplaces. Consequently, proactive training policies can effectively mitigate short-term displacement.',
            },
            speakingTopicPrompt:
              'Discuss how AI augments or reshapes your field and why upskilling and nuanced human judgment matter',
          },
        ],
      },
    ],
  },
];
