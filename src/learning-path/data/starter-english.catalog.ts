import type {
  UnitReadingListening,
  UnitStudyGuide,
  UnitVocabWord,
  UnitWritingPrompt,
} from '../entities/learning-path-unit.entity.js';
import type { LearningGoalBand } from '../dto/learning-path.dto.js';

export interface SeedUnitWithGuideSpec {
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

export interface StarterTrackSpec {
  code: LearningGoalBand;
  title: string;
  cefrLevel: string;
  languageCode: string;
  summary: string;
  parts: Array<{
    partNumber: number;
    title: string;
    subtitle: string;
    units: SeedUnitWithGuideSpec[];
  }>;
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

export const ENGLISH_STARTER_A0_TRACK: StarterTrackSpec = {
  code: 'starter_a0',
  title: 'Số 0 → Nền tảng (English Zero)',
  cefrLevel: 'A0',
  languageCode: 'en',
  summary:
    'Dành cho người mới hoàn toàn hoặc mất gốc: bảng chữ cái A–Z, phát âm cơ bản, 35+ từ sống còn và ghép câu 3–5 từ đầu tiên.',
  parts: [
    {
      partNumber: 1,
      title: 'Từ con số 0 · Bảng chữ cái, Âm & Chào hỏi',
      subtitle:
        'Làm quen mặt chữ, cách phát âm IPA dễ hiểu, số đếm và từ vựng sinh tồn đầu tiên',
      units: [
        {
          unitNumber: 1,
          slug: 'en-a0-alphabet-sounds',
          title: 'Bảng chữ cái A–Z & Phát âm chuẩn',
          topicName: 'Alphabet & First Words',
          icon: 'sparkles',
          themeColor: 'green',
          grammarFocus: '26 chữ cái A–Z, 5 nguyên âm A-E-I-O-U & đọc từng từ',
          studyGuide: {
            overview:
              'Nếu bạn chưa biết gì về tiếng Anh, hãy bắt đầu bằng cách nhận diện mặt chữ A–Z và 5 nguyên âm (a, e, i, o, u). Đừng cố đọc nhanh — chỉ cần nghe chậm 0.8x và lặp lại từng từ rõ ràng.',
            grammarPoints: [
              {
                title: '5 Nguyên âm cốt lõi: A - E - I - O - U',
                explanation:
                  'Mọi từ tiếng Anh đều xoay quanh 5 nguyên âm này. Khi ghép với phụ âm, âm tiết thay đổi tùy chữ đứng cạnh.',
                example: 'apple (a), pen (e), sit (i), hot (o), cup (u)',
              },
              {
                title: 'Không bỏ âm cuối (Ending Sounds)',
                explanation:
                  'Khác tiếng Việt, tiếng Anh phát âm nhẹ ở đuôi từ (/k/, /t/, /p/, /s/). Chỉ cần bật hơi nhẹ chữ cuối là người nghe đã hiểu đúng.',
                example: 'book (/k/ nhẹ cuối), name (/m/ khép môi), cat (/t/)',
              },
            ],
            keyPatterns: [
              {
                pattern: 'A is for ... / B is for ...',
                meaning: 'Chữ A dùng cho từ ... (cách nhớ chữ cái kèm từ mẫu)',
                example: 'A is for apple. B is for book.',
              },
              {
                pattern: 'My name is + [tên của bạn].',
                meaning: 'Tên của tôi là ...',
                example: 'My name is Lan.',
              },
            ],
            commonMistakes: [
              {
                mistake: 'Đọc "name" thành "nêm" quên khép môi âm /m/',
                correction: 'name (/neɪm/) — khép nhẹ hai môi ở cuối',
                tip: 'Nhìn phiên âm /.../ ngay bên dưới mỗi từ để nhớ âm cuối.',
              },
              {
                mistake: 'Đọc chữ E như "i" Việt và quên âm /s/ hoặc /k/',
                correction: 'Nghe bản 0.8x hai lần trước khi đọc theo',
                tip: 'Chạm nút Nghe trên mỗi thẻ từ để luyện tai quen dần.',
              },
            ],
            studyTips: [
              'Mở Phòng học vỡ lòng (/starter) để bấm nghe từng chữ cái A–Z bất cứ lúc nào.',
              'Học 5–6 từ mỗi ngày, đọc to thành tiếng thay vì chỉ nhìn mắt.',
            ],
          },
          vocabulary: [
            w(
              'alphabet',
              '/ˈælfəbet/',
              'noun',
              'bảng chữ cái',
              'The English alphabet has 26 letters.',
              'Nhấn vào âm đầu AL-. Chữ "ph" đọc thành âm /f/.',
            ),
            w(
              'apple',
              '/ˈæpl/',
              'noun',
              'quả táo (từ mẫu chữ A)',
              'One red apple, please.',
              'Mở rộng miệng vừa khi đọc âm /æ/.',
            ),
            w(
              'book',
              '/bʊk/',
              'noun',
              'quyển sách (từ mẫu chữ B)',
              'This is my English book.',
              'Bật nhẹ âm /k/ ở cuối từ.',
            ),
            w(
              'name',
              '/neɪm/',
              'noun',
              'tên gọi',
              'My name is An.',
              'Đọc vần /eɪ/ rồi khép môi lại ở âm /m/.',
            ),
            w(
              'water',
              '/ˈwɔːtər/',
              'noun',
              'nước uống',
              'Water, please!',
              'Chu môi nhẹ khi bắt đầu bằng chữ W.',
            ),
            w(
              'hello',
              '/həˈloʊ/',
              'phrase',
              'xin chào',
              'Hello! My name is Minh.',
              'Từ đầu tiên bạn có thể dùng ngay với mọi người.',
            ),
          ],
          readingListening: {
            title: 'First Words · Những chữ cái và từ đầu tiên',
            audioScript:
              'Hello! Welcome to English. A is for apple. B is for book. My name is An. Water, please!',
            translation:
              'Xin chào! Chào mừng bạn đến với tiếng Anh. A là apple (táo). B là book (sách). Tên tôi là An. Làm ơn cho tôi nước!',
            questions: [
              {
                id: 'a0u1-q1',
                prompt: 'Từ mẫu cho chữ B trong bài nghe là gì?',
                options: [
                  'book (quyển sách)',
                  'apple (quả táo)',
                  'water (nước)',
                ],
                correctIndex: 0,
                explanation: 'Bài nghe nói rõ: "B is for book."',
              },
              {
                id: 'a0u1-q2',
                prompt: 'Người nói giới thiệu tên mình là gì?',
                options: ['Minh', 'An', 'Lan'],
                correctIndex: 1,
                explanation: 'Câu trong bài nghe: "My name is An."',
              },
              {
                id: 'a0u1-q3',
                prompt: 'Khi xin một ít nước thật đơn giản, ta nói thế nào?',
                options: ['Book, please!', 'Water, please!', 'Apple, hello!'],
                correctIndex: 1,
                explanation: '"Water, please!" nghĩa là "Làm ơn cho tôi nước".',
              },
            ],
          },
          writing: {
            prompt:
              'Viết 1–2 câu siêu ngắn chào hỏi và giới thiệu tên của bạn (gợi ý: "Hello! My name is ...").',
            minSentences: 1,
            targetBand: 'Zero A0',
            targetTerms: ['hello', 'name', 'book'],
            sampleAnswer: 'Hello! My name is An. This is my book.',
          },
          speakingTopicPrompt:
            'Say hello and introduce your first name in one simple sentence.',
        },
        {
          unitNumber: 2,
          slug: 'en-a0-greetings',
          title: 'Chào hỏi, Cảm ơn & Lời nói lịch sự',
          topicName: 'Greetings & Polite Words',
          icon: 'home',
          themeColor: 'pink',
          grammarFocus: 'Chào theo buổi, Yes/No, Thank you & Please',
          studyGuide: {
            overview:
              'Chỉ với 6 cụm từ lịch sự này, bạn đã có thể bắt đầu và kết thúc hầu hết cuộc trò chuyện ngắn với người nước ngoài mà chưa cần biết ngữ pháp phức tạp.',
            grammarPoints: [
              {
                title: 'Chào theo thời điểm trong ngày',
                explanation:
                  'Dùng Good morning (buổi sáng), Good afternoon (buổi chiều), hoặc Hello bất kỳ lúc nào.',
                example: 'Good morning! Nice to meet you.',
              },
              {
                title: 'Từ khóa lịch sự "Please" & "Thank you"',
                explanation:
                  'Thêm "please" ở cuối câu khi nhờ giúp hoặc gọi đồ; nói "thank you" ngay khi nhận được.',
                example: 'Water, please. Thank you!',
              },
            ],
            keyPatterns: [
              {
                pattern: 'Hello! How are you? — I am good, thank you.',
                meaning: 'Xin chào! Bạn khỏe không? — Tôi khỏe, cảm ơn bạn.',
                example: 'Hello! How are you? I am good.',
              },
              {
                pattern: 'Sorry, ... / Excuse me, ...',
                meaning: 'Xin lỗi (nhận lỗi) / Làm phiền một chút (gọi hỏi)',
                example: 'Excuse me, water please!',
              },
            ],
            commonMistakes: [
              {
                mistake:
                  'Đọc "Thank you" quên âm "th" ở đầu (thành "tanh kiu")',
                correction:
                  'thank you (/ˈθæŋk juː/) — đặt đầu lưỡi nhẹ giữa hai răng',
                tip: 'Chưa quen đặt lưỡi cũng không sao, nghe chậm nhiều lần sẽ quen dần.',
              },
            ],
            studyTips: [
              'Mỗi sáng hãy tự nói "Good morning!" trước gương để tạo phản xạ.',
            ],
          },
          vocabulary: [
            w(
              'good morning',
              '/ɡʊd ˈmɔːrnɪŋ/',
              'phrase',
              'chào buổi sáng',
              'Good morning! How are you?',
              'Dùng từ sáng đến trước 12 giờ trưa.',
            ),
            w(
              'thank you',
              '/ˈθæŋk juː/',
              'phrase',
              'cảm ơn bạn',
              'Thank you very much!',
              'Có thể nói ngắn gọn là "Thanks!" với bạn bè.',
            ),
            w(
              'please',
              '/pliːz/',
              'adverb',
              'làm ơn, vui lòng',
              'One coffee, please.',
              'Đặt ở cuối câu khiến lời nói lịch sự ngay lập tức.',
            ),
            w(
              'sorry',
              '/ˈsɑːri/',
              'adjective',
              'xin lỗi',
              'I am sorry. I am late.',
              'Dùng khi mình làm phiền hoặc sai.',
            ),
            w(
              'yes',
              '/jes/',
              'adverb',
              'vâng, có, đúng rồi',
              'Yes, please!',
              'Đọc kéo nhẹ âm /s/ ở cuối.',
            ),
            w(
              'no',
              '/noʊ/',
              'adverb',
              'không',
              'No, thank you.',
              'Khi từ chối lịch sự hãy ghép "No, thank you."',
            ),
          ],
          readingListening: {
            title: 'A Friendly Morning · Buổi sáng thân thiện',
            audioScript:
              'Good morning! How are you? I am good, thank you. Do you want water? Yes, please! Here you are. Thank you!',
            translation:
              'Chào buổi sáng! Bạn khỏe không? Tôi khỏe, cảm ơn bạn. Bạn có muốn uống nước không? Vâng, làm ơn! Của bạn đây. Cảm ơn bạn!',
            questions: [
              {
                id: 'a0u2-q1',
                prompt: '"Good morning" nghĩa là gì?',
                options: ['Chào buổi sáng', 'Tạm biệt', 'Xin lỗi'],
                correctIndex: 0,
                explanation: '"Good morning" là lời chào vào buổi sáng.',
              },
              {
                id: 'a0u2-q2',
                prompt:
                  'Khi đồng ý nhận nước một cách lịch sự, người nói đáp thế nào?',
                options: ['No, sorry.', 'Yes, please!', 'Good morning!'],
                correctIndex: 1,
                explanation:
                  '"Yes, please!" dùng để nhận lời một cách lịch sự.',
              },
              {
                id: 'a0u2-q3',
                prompt: 'Nếu muốn từ chối lịch sự, ta nói cụm nào?',
                options: ['No, thank you.', 'Yes, sorry.', 'Please no.'],
                correctIndex: 0,
                explanation:
                  '"No, thank you." là cách từ chối nhẹ nhàng, lịch sự.',
              },
            ],
          },
          writing: {
            prompt:
              'Viết 1–2 câu chào buổi sáng và nói cảm ơn bằng tiếng Anh (gợi ý: "Good morning! Thank you...").',
            minSentences: 1,
            targetBand: 'Zero A0',
            targetTerms: ['good morning', 'thank you', 'please'],
            sampleAnswer: 'Good morning! Water, please. Thank you!',
          },
          speakingTopicPrompt:
            'Practice saying Good morning, asking for water politely with please, and saying thank you.',
        },
        {
          unitNumber: 3,
          slug: 'en-a0-numbers-time',
          title: 'Số đếm 1–20, Tuổi & Giá tiền',
          topicName: 'Numbers & Prices',
          icon: 'clock',
          themeColor: 'lavender',
          grammarFocus: 'Số đếm 1–20, hỏi giá How much & nói tuổi',
          studyGuide: {
            overview:
              'Số đếm là nền tảng dùng mỗi ngày: đọc số điện thoại, nói tuổi, xem giờ và hỏi giá khi mua hàng.',
            grammarPoints: [
              {
                title: 'Nói tuổi với I am + số',
                explanation:
                  'Trong tiếng Anh ta nói "Tôi [số] tuổi" bằng I am + số (không dùng "have").',
                example: 'I am twenty. (Tôi 20 tuổi.)',
              },
              {
                title: 'Hỏi giá siêu ngắn: How much?',
                explanation:
                  'Chỉ vào món đồ muốn mua và hỏi "How much?" hoặc "How much is this?"',
                example: 'How much is this coffee? — Two dollars.',
              },
            ],
            keyPatterns: [
              {
                pattern: 'One / Two / Three + [danh từ]',
                meaning: 'Một / Hai / Ba cái gì đó',
                example: 'Two coffees, please.',
              },
              {
                pattern: 'I am [số].',
                meaning: 'Tôi [số] tuổi.',
                example: 'I am twenty.',
              },
            ],
            commonMistakes: [
              {
                mistake: 'Dùng "I have 20 years" khi nói tuổi',
                correction: 'I am twenty. / I am twenty years old.',
                tip: 'Luôn nhớ tuổi đi với "I am", không dùng "have".',
              },
            ],
            studyTips: [
              'Đọc to số điện thoại của mình bằng tiếng Anh từng số một (0 = zero / oh).',
            ],
          },
          vocabulary: [
            w(
              'one',
              '/wʌn/',
              'number',
              'số 1',
              'One book, please.',
              'Đọc là "oăn", không phải "oan".',
            ),
            w(
              'two',
              '/tuː/',
              'number',
              'số 2',
              'Two apples, please.',
              'Chữ W bị câm, đọc như "tu".',
            ),
            w(
              'five',
              '/faɪv/',
              'number',
              'số 5',
              'Five dollars.',
              'Chạm nhẹ răng trên vào môi dưới cho âm /v/ cuối.',
            ),
            w(
              'ten',
              '/ten/',
              'number',
              'số 10',
              'I have ten pens.',
              'Ngắn gọn, dứt khoát.',
            ),
            w(
              'twenty',
              '/ˈtwenti/',
              'number',
              'số 20',
              'I am twenty.',
              'Nhấn vào âm đầu TWEN-.',
            ),
            w(
              'how much',
              '/haʊ mʌtʃ/',
              'phrase',
              'bao nhiêu tiền',
              'How much is this?',
              'Câu hỏi sinh tồn khi đi mua sắm.',
            ),
          ],
          readingListening: {
            title: 'Counting Apples · Đếm số và hỏi giá',
            audioScript:
              'Hello! I want two apples and one water, please. How much is this? It is five dollars. Thank you!',
            translation:
              'Xin chào! Tôi muốn 2 quả táo và 1 chai nước, làm ơn. Chỗ này bao nhiêu tiền? Giá là 5 đô la. Cảm ơn!',
            questions: [
              {
                id: 'a0u3-q1',
                prompt: 'Khách hàng muốn mua mấy quả táo?',
                options: ['One (1 quả)', 'Two (2 quả)', 'Five (5 quả)'],
                correctIndex: 1,
                explanation: 'Bài nghe nói: "I want two apples".',
              },
              {
                id: 'a0u3-q2',
                prompt: 'Tổng số tiền phải trả là bao nhiêu?',
                options: ['Ten dollars', 'Two dollars', 'Five dollars'],
                correctIndex: 2,
                explanation: '"It is five dollars" = 5 đô la.',
              },
              {
                id: 'a0u3-q3',
                prompt: 'Muốn hỏi "Cái này bao nhiêu tiền?" ta dùng câu nào?',
                options: [
                  'How much is this?',
                  'My name is ten.',
                  'Two, sorry.',
                ],
                correctIndex: 0,
                explanation: '"How much is this?" dùng để hỏi giá món đồ.',
              },
            ],
          },
          writing: {
            prompt:
              'Viết 1–2 câu đơn giản sử dụng số đếm hoặc hỏi giá (gợi ý: "Two apples, please. How much is this?").',
            minSentences: 1,
            targetBand: 'Zero A0',
            targetTerms: ['one', 'two', 'how much'],
            sampleAnswer: 'Two apples, please. How much is this?',
          },
          speakingTopicPrompt:
            'Say a number from 1 to 10 and ask "How much is this?"',
        },
        {
          unitNumber: 4,
          slug: 'en-a0-family-people',
          title: 'Gia đình, Bạn bè & Đại từ I / You',
          topicName: 'Family & People',
          icon: 'book-open',
          themeColor: 'cream',
          grammarFocus: 'Đại từ I / You / My & từ vựng gia đình thân thuộc',
          studyGuide: {
            overview:
              'Làm quen với cách gọi bản thân (I / My), người nghe (You) và những người gần gũi nhất quanh bạn: mẹ, bố, bạn bè, giáo viên.',
            grammarPoints: [
              {
                title: 'I (tôi) vs My (của tôi)',
                explanation:
                  'Dùng "I" đứng đầu câu hành động ("I am a student"). Dùng "My" trước danh từ ("My mother", "My friend").',
                example: 'My mother is at home. I love my family.',
              },
            ],
            keyPatterns: [
              {
                pattern: 'This is my + [người thân].',
                meaning: 'Đây là ... của tôi.',
                example: 'This is my friend, Hoa.',
              },
              {
                pattern: 'I am a + [nghề/vai trò].',
                meaning: 'Tôi là một ...',
                example: 'I am a student.',
              },
            ],
            commonMistakes: [
              {
                mistake: 'Nhầm dùng "I mother" thay cho "My mother"',
                correction: 'My mother (Mẹ của tôi)',
                tip: 'Cứ có "của tôi" hãy dùng "My".',
              },
            ],
            studyTips: [
              'Tập chỉ vào ảnh gia đình và nói: "This is my mother. This is my father."',
            ],
          },
          vocabulary: [
            w(
              'mother',
              '/ˈmʌðər/',
              'noun',
              'mẹ',
              'My mother is kind.',
              'Cũng có thể gọi thân mật là mom.',
            ),
            w(
              'father',
              '/ˈfɑːðər/',
              'noun',
              'bố, cha',
              'My father likes coffee.',
              'Gọi thân mật là dad.',
            ),
            w(
              'friend',
              '/frend/',
              'noun',
              'bạn bè',
              'Hoa is my good friend.',
              'Đừng quên bật âm /d/ nhẹ ở cuối.',
            ),
            w(
              'student',
              '/ˈstuːdnt/',
              'noun',
              'học sinh, sinh viên',
              'I am a new student.',
              'Nhấn vào âm STU-.',
            ),
            w(
              'teacher',
              '/ˈtiːtʃər/',
              'noun',
              'giáo viên',
              'My teacher is very friendly.',
              'Âm "ch" đọc bật hơi nhẹ /tʃ/.',
            ),
            w(
              'home',
              '/hoʊm/',
              'noun',
              'nhà, tổ ấm',
              'I am at home today.',
              'Khép môi nhẹ ở âm /m/ cuối từ.',
            ),
          ],
          readingListening: {
            title: 'My Family · Gia đình nhỏ của tôi',
            audioScript:
              'Hello! I am Linh. I am a student. This is my mother and this is my father. We are at home today. Hoa is my friend.',
            translation:
              'Xin chào! Tôi là Linh. Tôi là sinh viên. Đây là mẹ tôi và đây là bố tôi. Hôm nay chúng tôi ở nhà. Hoa là bạn của tôi.',
            questions: [
              {
                id: 'a0u4-q1',
                prompt: 'Linh hiện đang là ai?',
                options: [
                  'A teacher (Giáo viên)',
                  'A student (Học sinh/Sinh viên)',
                  'A father (Bố)',
                ],
                correctIndex: 1,
                explanation: 'Trong bài nghe: "I am a student."',
              },
              {
                id: 'a0u4-q2',
                prompt: 'Hôm nay gia đình Linh đang ở đâu?',
                options: ['At home (Ở nhà)', 'At school', 'At a shop'],
                correctIndex: 0,
                explanation:
                  '"We are at home today." = Hôm nay chúng tôi ở nhà.',
              },
              {
                id: 'a0u4-q3',
                prompt: 'Hoa là ai đối với Linh?',
                options: ['Mother (Mẹ)', 'Friend (Bạn)', 'Teacher (Giáo viên)'],
                correctIndex: 1,
                explanation: '"Hoa is my friend." = Hoa là bạn của tôi.',
              },
            ],
          },
          writing: {
            prompt:
              'Viết 1–2 câu giới thiệu bạn là học sinh/bạn bè hoặc nói về một người trong gia đình (gợi ý: "This is my mother. I am a student.").',
            minSentences: 1,
            targetBand: 'Zero A0',
            targetTerms: ['mother', 'friend', 'student'],
            sampleAnswer: 'I am a student. This is my friend.',
          },
          speakingTopicPrompt:
            'Say who you are and introduce one family member or friend using "This is my...".',
        },
      ],
    },
    {
      partNumber: 2,
      title: 'Những câu đơn đầu tiên · Giới thiệu & Gọi món',
      subtitle:
        'Ghép 3–5 từ thành câu nói thật dùng hằng ngày với động từ to-be và gọi đồ ăn thức uống',
      units: [
        {
          unitNumber: 5,
          slug: 'en-a0-simple-to-be',
          title: 'Câu giới thiệu bản thân với I am / This is',
          topicName: 'Simple To-Be Sentences',
          icon: 'target',
          themeColor: 'green',
          grammarFocus: 'I am / You are / This is + tính từ & quê quán',
          studyGuide: {
            overview:
              'Đây là bước nhảy vọt đầu tiên từ đọc từ lẻ sang nói cả câu hoàn chỉnh! Bạn chỉ cần nhớ công thức vàng: I am + ..., You are + ..., This is + ...',
            grammarPoints: [
              {
                title: 'Cặp bài trùng I am / You are / He-She is',
                explanation:
                  'Không cần chia động từ phức tạp: chỉ có 3 từ nối chính là am (đi với I), are (đi với You/We), và is (đi với He/She/It/This).',
                example: 'I am happy. You are kind. This is Vietnam.',
              },
              {
                title: 'Nói quốc tịch & quê hương: I am from...',
                explanation:
                  'Muốn nói bạn đến từ đâu, chỉ cần ghép "I am from + tên nước/thành phố".',
                example: 'I am from Vietnam. I live in Hanoi.',
              },
            ],
            keyPatterns: [
              {
                pattern: 'I am from Vietnam.',
                meaning: 'Tôi đến từ Việt Nam.',
                example: 'Hello! I am Nam and I am from Vietnam.',
              },
              {
                pattern: 'I am [tính từ cảm xúc].',
                meaning: 'Tôi cảm thấy ...',
                example: 'I am happy today.',
              },
            ],
            commonMistakes: [
              {
                mistake: 'Nói thiếu to-be: "I happy" hoặc "My name An"',
                correction: 'I am happy. / My name is An.',
                tip: 'Câu tiếng Anh luôn cần một động từ ở giữa (am / is / are).',
              },
            ],
            studyTips: [
              'Thử thay 3 mảnh câu ở mục Ghép câu trong Phòng học vỡ lòng (/starter) để tạo 5 câu khác nhau.',
            ],
          },
          vocabulary: [
            w(
              'from',
              '/frʌm/',
              'preposition',
              'đến từ',
              'I am from Vietnam.',
              'Luôn dùng trong mẫu "I am from...".',
            ),
            w(
              'happy',
              '/ˈhæpi/',
              'adjective',
              'vui vẻ, hạnh phúc',
              'I am very happy today.',
              'Nhấn âm đầu HAP-.',
            ),
            w(
              'tired',
              '/ˈtaɪərd/',
              'adjective',
              'mệt mỏi',
              'Are you tired?',
              'Cẩn thận 2 vần /taɪ-ərd/.',
            ),
            w(
              'today',
              '/təˈdeɪ/',
              'adverb',
              'hôm nay',
              'Today is a good day.',
              'Đặt ở đầu hoặc cuối câu đều đúng.',
            ),
            w(
              'nice',
              '/naɪs/',
              'adjective',
              'tốt bụng, dễ thương',
              'Nice to meet you!',
              'Bật nhẹ âm /s/ cuối.',
            ),
            w(
              'good',
              '/ɡʊd/',
              'adjective',
              'tốt, khỏe',
              'I am good!',
              'Đọc ngắn và gọn âm u.',
            ),
          ],
          readingListening: {
            title: 'Nice to Meet You · Rất vui được gặp bạn',
            audioScript:
              'Hi! I am Nam. I am from Vietnam. I am a student. Today I am very happy. Nice to meet you!',
            translation:
              'Chào bạn! Tôi là Nam. Tôi đến từ Việt Nam. Tôi là sinh viên. Hôm nay tôi rất vui. Rất vui được gặp bạn!',
            questions: [
              {
                id: 'a0u5-q1',
                prompt: 'Nam đến từ đâu?',
                options: ['Japan', 'Vietnam', 'Korea'],
                correctIndex: 1,
                explanation: 'Bài nghe nói: "I am from Vietnam."',
              },
              {
                id: 'a0u5-q2',
                prompt: 'Hôm nay Nam cảm thấy thế nào?',
                options: [
                  'Very happy (Rất vui)',
                  'Tired (Mệt)',
                  'Sorry (Xin lỗi)',
                ],
                correctIndex: 0,
                explanation: '"Today I am very happy." = Hôm nay tôi rất vui.',
              },
              {
                id: 'a0u5-q3',
                prompt: 'Câu nào đúng ngữ pháp với "to-be"?',
                options: [
                  'I happy today.',
                  'I am happy today.',
                  'I is happy today.',
                ],
                correctIndex: 1,
                explanation: '"I" luôn đi với "am": "I am happy today."',
              },
            ],
          },
          writing: {
            prompt:
              'Viết 2 câu tự giới thiệu quê hương và cảm xúc hôm nay (gợi ý: "I am from Vietnam. I am happy today.").',
            minSentences: 1,
            targetBand: 'Zero A0',
            targetTerms: ['from', 'happy', 'today'],
            sampleAnswer: 'I am Minh. I am from Vietnam and I am happy today.',
          },
          speakingTopicPrompt:
            'Tell the tutor your name, where you are from, and how you feel today in 1–2 short sentences.',
        },
        {
          unitNumber: 6,
          slug: 'en-a0-daily-survival',
          title: 'Đồ ăn, Nước uống & Gọi món sinh tồn',
          topicName: 'Survival Food & Ordering',
          icon: 'globe',
          themeColor: 'cream',
          grammarFocus:
            'Mẫu câu "I like...", "I want..." và gọi món với "please"',
          studyGuide: {
            overview:
              'Hoàn thành bài này, bạn đã biết gọi món ăn/đồ uống cơ bản, nói món mình thích và khen đồ ăn ngon một cách tự nhiên.',
            grammarPoints: [
              {
                title: 'Nói sở thích & nhu cầu: I like... / I want...',
                explanation:
                  'Ghép I like + món bạn thích hoặc I want + món bạn muốn gọi ngay lúc đó.',
                example: 'I like coffee. I want one rice, please.',
              },
            ],
            keyPatterns: [
              {
                pattern: 'One [món], please.',
                meaning: 'Cho tôi một [món], làm ơn.',
                example: 'One iced coffee, please.',
              },
              {
                pattern: 'It is delicious!',
                meaning: 'Nó thật ngon!',
                example: 'This rice is delicious.',
              },
            ],
            commonMistakes: [
              {
                mistake: 'Nói "I want coffee" cụt lủn khi gọi người phục vụ',
                correction: 'One coffee, please. / Coffee, please.',
                tip: 'Chỉ cần thêm "please" là câu lịch sự hơn hẳn.',
              },
            ],
            studyTips: [
              'Sau khi xong 6 bài A0, bạn đã đủ nền tảng để bước tiếp vào lộ trình Band 4.5–5.5 hoặc dùng AI Tutor!',
            ],
          },
          vocabulary: [
            w(
              'coffee',
              '/ˈkɔːfi/',
              'noun',
              'cà phê',
              'One coffee, please!',
              'Nhấn âm đầu COF-.',
            ),
            w(
              'rice',
              '/raɪs/',
              'noun',
              'cơm, gạo',
              'I eat rice every day.',
              'Kéo nhẹ âm /s/ cuối để không nhầm với "right".',
            ),
            w(
              'noodles',
              '/ˈnuːdlz/',
              'noun',
              'mì, phở, bún',
              'Chicken noodles are yummy.',
              'Thường thêm "s" ở dạng số nhiều.',
            ),
            w(
              'menu',
              '/ˈmenjuː/',
              'noun',
              'thực đơn',
              'The menu, please.',
              'Đọc có âm /j/ nhẹ: "me-niu".',
            ),
            w(
              'like',
              '/laɪk/',
              'verb',
              'thích',
              'I like Vietnamese food.',
              'Bật nhẹ âm /k/ cuối từ.',
            ),
            w(
              'delicious',
              '/dɪˈlɪʃəs/',
              'adjective',
              'rất ngon',
              'This coffee is delicious!',
              'Nhấn vào âm thứ hai -LI-.',
            ),
          ],
          readingListening: {
            title: 'At a Small Café · Ở một quán nhỏ',
            audioScript:
              'Hello! Menu, please. Sure, here is the menu. I want noodles and one coffee, please. This food is delicious! Thank you!',
            translation:
              'Xin chào! Cho tôi xem thực đơn với ạ. Vâng, thực đơn đây ạ. Tôi muốn gọi mì và một ly cà phê. Món này ngon quá! Cảm ơn!',
            questions: [
              {
                id: 'a0u6-q1',
                prompt: 'Khi mới vào quán muốn xem danh sách món, bạn xin gì?',
                options: ['Menu, please.', 'Home, please.', 'Name, please.'],
                correctIndex: 0,
                explanation: '"Menu, please." = Cho tôi xem thực đơn.',
              },
              {
                id: 'a0u6-q2',
                prompt: 'Khách hàng đã gọi món gì?',
                options: [
                  'Apple and water',
                  'Noodles and one coffee',
                  'Book and pen',
                ],
                correctIndex: 1,
                explanation: '"I want noodles and one coffee, please."',
              },
              {
                id: 'a0u6-q3',
                prompt: '"Delicious" dùng để khen điều gì?',
                options: ['Đồ ăn rất ngon', 'Trời rất nóng', 'Bạn rất mệt'],
                correctIndex: 0,
                explanation: '"Delicious" nghĩa là ngon miệng.',
              },
            ],
          },
          writing: {
            prompt:
              'Viết 1–2 câu gọi một món ăn hoặc đồ uống bạn thích (gợi ý: "I like coffee. One coffee, please.").',
            minSentences: 1,
            targetBand: 'Zero A0',
            targetTerms: ['coffee', 'like', 'please'],
            sampleAnswer: 'I like coffee. One coffee, please. It is delicious!',
          },
          speakingTopicPrompt:
            'Order one food or drink you like politely using "please" and say if you like it.',
        },
      ],
    },
  ],
};
