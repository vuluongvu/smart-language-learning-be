import type { UnitVocabWord } from '../entities/learning-path-unit.entity.js';
import type { StarterTrackSpec } from './starter-english.catalog.js';

function kw(
  term: string,
  pronunciation: string,
  partOfSpeech: string,
  definition: string,
  example: string,
  notes: string,
): UnitVocabWord {
  return { term, pronunciation, partOfSpeech, definition, example, notes };
}

export const KOREAN_STARTER_A0_TRACK: StarterTrackSpec = {
  code: 'ko_starter_a0',
  title: 'Nhập môn Hangul · Từ số 0',
  cefrLevel: 'A0',
  languageCode: 'ko',
  summary:
    'Chưa biết chữ Hangul? Bắt đầu từ 10 nguyên âm, 14 phụ âm, cách ghép khối chữ vuông, batchim đơn giản và 30+ từ câu nhập môn.',
  parts: [
    {
      partNumber: 1,
      title: '한글 기초 · Bảng chữ cái Hangul & Ghép vần',
      subtitle:
        'Học đọc và viết từng nét Hangul từ con số 0 trước khi vào câu giao tiếp',
      units: [
        {
          unitNumber: 1,
          slug: 'ko-a0-basic-vowels',
          title: '10 Nguyên âm cơ bản & Âm câm ㅇ (아·어·오·우)',
          topicName: '모음 기초 (Nguyên âm)',
          icon: 'sparkles',
          themeColor: 'green',
          grammarFocus:
            'Nguyên âm đơn ㅏ·ㅓ·ㅗ·ㅜ·ㅡ·ㅣ & vai trò âm câm ㅇ ở đầu chữ',
          studyGuide: {
            overview:
              'Chữ Hàn Quốc (Hangul) cực kỳ khoa học: mỗi ô chữ gồm ít nhất 1 Phụ âm đứng trước + 1 Nguyên âm. Khi từ chỉ có nguyên âm (như "a", "o"), người Hàn đặt chữ tròn ㅇ (âm câm) đứng làm chỗ dựa.',
            grammarPoints: [
              {
                title: 'Vị trí đứng của nguyên âm: bên phải vs bên dưới',
                explanation:
                  'Nguyên âm nét dọc (ㅏ a, ㅓ eo, ㅣ i) viết bên PHẢI phụ âm (아, 어, 이). Nguyên âm nét ngang (ㅗ o, ㅜ u, ㅡ eu) viết bên DƯỚI phụ âm (오, 우, 으).',
                example: 'ㅇ + ㅏ = 아 (a) | ㅇ + ㅗ = 오 (o)',
              },
              {
                title: 'Âm tròn ㅇ ở đầu âm tiết KHÔNG phát âm',
                explanation:
                  'Chữ ㅇ đứng đầu ô chữ chỉ là ký hiệu giữ chỗ (âm câm), nên "아" đọc đúng bằng nguyên âm "a".',
                example: '아이 (a-i = em bé), 우유 (u-yu = sữa)',
              },
            ],
            keyPatterns: [
              {
                pattern: '아 / 어 / 오 / 우 / 으 / 이',
                meaning: '6 âm cơ bản cần nghe & đọc phân biệt rõ khẩu hình',
                example:
                  '아 (há miệng vừa) · 어 (tròn môi nhẹ) · 오 (chu môi nhỏ)',
              },
            ],
            commonMistakes: [
              {
                mistake: 'Đọc nhầm "어 (eo)" giống hệt "오 (o)"',
                correction:
                  '어 mở hàm hơi dọc, không chu môi; 오 chu môi tròn rõ',
                tip: 'Bấm nút Nghe chậm (0.8x) nhiều lần để tai tách biệt hai âm này.',
              },
              {
                mistake: 'Viết mỗi nguyên âm ㅏ đứng trơ trọi một mình',
                correction: 'Phải viết đầy đủ ô có âm câm đầu ㅇ -> 아',
                tip: 'Dùng nút "Tập viết" ngay trên từng thẻ từ để tập thứ tự nét đúng.',
              },
            ],
            studyTips: [
              'Vào Phòng học vỡ lòng (/starter) để ghép thử ㅇ + ㅏ, ㅓ, ㅗ, ㅜ trực tiếp.',
              'Mỗi từ trong bài đều là từ ghép purely từ nguyên âm — rất dễ đọc ngày đầu tiên!',
            ],
          },
          vocabulary: [
            kw(
              '아이',
              '[아이 / a-i]',
              'noun',
              'em bé, trẻ nhỏ',
              '아이가 웃어요.',
              'Ghép bởi 아 (a) + 이 (i) — 100% nguyên âm.',
            ),
            kw(
              '우유',
              '[우유 / u-yu]',
              'noun',
              'sữa',
              '아침에 우유를 마셔요.',
              '우 (u) + 유 (yu). Nguyên âm nét ngang nằm dưới ㅇ.',
            ),
            kw(
              '오이',
              '[오이 / o-i]',
              'noun',
              'dưa chuột',
              '오이가 신선해요.',
              '오 (o) + 이 (i) — luyện phân biệt ô tròn môi và i.',
            ),
            kw(
              '여우',
              '[여우 / yeo-u]',
              'noun',
              'con cáo',
              '여우가 귀여워요.',
              '여 (yeo) có hai nét ngang nhỏ từ 어.',
            ),
            kw(
              '이유',
              '[이유 / i-yu]',
              'noun',
              'lý do',
              '무슨 이유예요?',
              'Từ vựng hay gặp ngay cả ở TOPIK.',
            ),
            kw(
              '아야',
              '[아야 / a-ya]',
              'phrase',
              'ối / đau quá',
              '아야! 아파요.',
              'Một nét thành 아, thêm một nét ngắn thành 야 (ya).',
            ),
          ],
          readingListening: {
            title: '모음 읽기 · Tập nghe đọc các từ nguyên âm đầu tiên',
            audioScript: '아, 어, 오, 우, 으, 이. 아이. 우유. 오이. 여우.',
            translation:
              'A, eo, o, u, eu, i. Em bé (a-i). Sữa (u-yu). Dưa chuột (o-i). Con cáo (yeo-u).',
            questions: [
              {
                id: 'koa0u1-q1',
                prompt: 'Từ nào có nghĩa là "em bé"?',
                options: ['아이 (a-i)', '우유 (u-yu)', '오이 (o-i)'],
                correctIndex: 0,
                explanation: '아이 (a-i) là em bé/trẻ nhỏ.',
              },
              {
                id: 'koa0u1-q2',
                prompt: 'Chữ ㅇ đứng ở đầu chữ "아" có tác dụng gì?',
                options: [
                  'Đọc là chữ "ng"',
                  'Là âm câm giữ chỗ cho nguyên âm',
                  'Đọc thành âm "h"',
                ],
                correctIndex: 1,
                explanation: 'Ở vị trí phụ âm đầu, ㅇ là âm câm.',
              },
              {
                id: 'koa0u1-q3',
                prompt: '"우유 (u-yu)" có nghĩa là gì?',
                options: ['Dưa chuột', 'Sữa', 'Con cáo'],
                correctIndex: 1,
                explanation: '우유 (u-yu) nghĩa là sữa.',
              },
            ],
          },
          writing: {
            prompt:
              'Tập viết và gõ 2–3 từ nguyên âm vừa học (gợi ý: "아이, 우유, 오이"). Bạn có thể bấm nút Tập viết ở thẻ từ để luyện nét trước!',
            minSentences: 1,
            targetBand: 'Zero A0',
            targetTerms: ['아이', '우유', '오이'],
            sampleAnswer: '아이 우유 오이',
          },
          speakingTopicPrompt:
            'Practice reading out loud the vowel words: 아이, 우유, 오이.',
        },
        {
          unitNumber: 2,
          slug: 'ko-a0-basic-consonants',
          title: 'Phụ âm cơ bản & Ghép chữ (가·나·다·마·바)',
          topicName: '자음 기초 (Phụ âm & Ghép vần)',
          icon: 'pen-line',
          themeColor: 'pink',
          grammarFocus:
            '7 phụ âm đầu ㄱ·ㄴ·ㄷ·ㄹ·ㅁ·ㅂ·ㅅ ghép với nguyên âm cơ bản',
          studyGuide: {
            overview:
              'Bây giờ thay âm câm ㅇ bằng các phụ âm thật như ㄱ (g/k), ㄴ (n), ㄷ (d/t), ㅁ (m), ㅂ (b/p), ㅅ (s)! Quy tắc ghép giống hệt tiếng Việt: Phụ âm đứng trước + Nguyên âm.',
            grammarPoints: [
              {
                title: 'Âm đọc mềm ở đầu từ của ㄱ, ㄷ, ㅂ',
                explanation:
                  'ㄱ đọc nhẹ giữa g và k; ㄷ đọc giữa d và t; ㅂ đọc giữa b và p; ㄴ đọc là n; ㅁ đọc là m; ㄹ đọc nhẹ gần l/r; ㅅ đọc là s (khi đi với ㅣ/ㅟ thành x/sh nhẹ).',
                example: '가 (ga/ka), 나 (na), 다 (da), 마 (ma), 바 (ba)',
              },
            ],
            keyPatterns: [
              {
                pattern: '[Phụ âm] + ㅏ / ㅗ / ㅜ',
                meaning: 'Cách ghép âm tiết không có âm cuối',
                example: '나 + 무 = 나무 (cây) | 바 + 다 = 바다 (biển)',
              },
            ],
            commonMistakes: [
              {
                mistake: 'Đọc phụ âm ㅅ + ㅣ (시) nặng như "sờ" tiếng Việt',
                correction: '시 đọc nhẹ gần "shi / xi"',
                tip: 'Hãy bấm Nghe trên thẻ từ để nghe giọng Hàn chuẩn.',
              },
            ],
            studyTips: [
              'Thử dùng Bộ ghép chữ Hangul trong Phòng học vỡ lòng (/starter) để bấm chọn phụ âm + nguyên âm và nghe từng âm ghép.',
            ],
          },
          vocabulary: [
            kw(
              '가다',
              '[가다 / ga-da]',
              'verb',
              'đi',
              '학교에 가요.',
              'ㄱ(g) + ㅏ(a) = 가; ㄷ(d) + ㅏ(a) = 다.',
            ),
            kw(
              '나무',
              '[나무 / na-mu]',
              'noun',
              'cái cây',
              '큰 나무가 있어요.',
              'ㄴ(n)+ㅏ(a)=나, ㅁ(m)+ㅜ(u)=무.',
            ),
            kw(
              '바다',
              '[바다 / ba-da]',
              'noun',
              'biển',
              '바다가 파래요.',
              'ㅂ(b)+ㅏ(a)=바, ㄷ(d)+ㅏ(a)=다.',
            ),
            kw(
              '모자',
              '[모자 / mo-ja]',
              'noun',
              'cái mũ / nón',
              '새 모자를 썼어요.',
              'ㅁ(m)+ㅗ(o)=모, ㅈ(j)+ㅏ(a)=자.',
            ),
            kw(
              '사과',
              '[사과 / sa-gwa]',
              'noun',
              'quả táo',
              '사과가 맛있어요.',
              'Một từ siêu quen thuộc với người mới.',
            ),
            kw(
              '지도',
              '[지도 / ji-do]',
              'noun',
              'bản đồ',
              '지도를 보세요.',
              'ㅈ(j)+ㅣ(i)=지, ㄷ(d)+ㅗ(o)=도.',
            ),
          ],
          readingListening: {
            title: '자음 조합 · Tập ghép đọc phụ âm cơ bản',
            audioScript: '가, 나, 다, 라, 마, 바, 사. 나무. 바다. 모자. 사과.',
            translation:
              'Ga, na, da, ra, ma, ba, sa. Cái cây (namu). Biển (bada). Cái mũ (moja). Quả táo (sagwa).',
            questions: [
              {
                id: 'koa0u2-q1',
                prompt: 'Ghép chữ ㄴ + ㅏ và ㅁ + ㅜ thành từ nào?',
                options: ['바다 (biển)', '나무 (cái cây)', '모자 (cái mũ)'],
                correctIndex: 1,
                explanation: 'ㄴ+ㅏ = 나, ㅁ+ㅜ = 무 -> 나무 (cái cây).',
              },
              {
                id: 'koa0u2-q2',
                prompt: 'Từ "바다 (ba-da)" nghĩa là gì?',
                options: ['Bản đồ', 'Biển', 'Đi'],
                correctIndex: 1,
                explanation: '바다 nghĩa là biển.',
              },
              {
                id: 'koa0u2-q3',
                prompt: 'Từ nào nghĩa là "quả táo"?',
                options: ['사과', '모자', '나무'],
                correctIndex: 0,
                explanation: '사과 (sa-gwa) là quả táo.',
              },
            ],
          },
          writing: {
            prompt:
              'Viết lại 3 từ ghép phụ âm vừa học bằng Hangul (gợi ý: "나무, 바다, 모자").',
            minSentences: 1,
            targetBand: 'Zero A0',
            targetTerms: ['나무', '바다', '모자'],
            sampleAnswer: '나무, 바다, 모자',
          },
          speakingTopicPrompt:
            'Read aloud simple 2-syllable words: 나무, 바다, 모자.',
        },
        {
          unitNumber: 3,
          slug: 'ko-a0-batchim-reading',
          title: 'Âm cuối Batchim & Đọc từ 1 âm tiết (밥·집·물·책)',
          topicName: '받침 기초 (Âm cuối Batchim)',
          icon: 'layers',
          themeColor: 'lavender',
          grammarFocus:
            'Cấu trúc 3 phần (Đầu + Giữa + Đuôi Batchim) & 4 từ sống còn',
          studyGuide: {
            overview:
              'Khi biết thêm Âm cuối (받침 - Batchim nằm ở hàng dưới cùng của ô chữ), bạn sẽ đọc được hơn 80% chữ viết tiếng Hàn ngoài đời thực như biển quán ăn, trạm tàu, thực đơn!',
            grammarPoints: [
              {
                title: 'Cấu trúc 3 tầng: Phụ âm đầu + Nguyên âm + Batchim',
                explanation:
                  'Batchim đứng dưới cùng khép âm giống phụ âm cuối tiếng Việt: -ㅂ (-p), -ㄱ (-c/k), -ㄴ (-n), -ㅁ (-m), -ㅇ (-ng), -ㄹ (-l).',
                example: '밥 (b+a+p = bap: cơm) | 집 (j+i+p = jip: nhà)',
              },
            ],
            keyPatterns: [
              {
                pattern: '집 / 밥 / 물 / 책',
                meaning: '4 chữ đơn dùng hằng ngày có Batchim rõ âm',
                example: '집에 가요 (Về nhà) · 물 주세요 (Cho xin nước)',
              },
            ],
            commonMistakes: [
              {
                mistake: 'Đọc chữ ㅇ ở ĐUÔI giống ㅇ ở ĐẦU (bỏ qua âm cuối)',
                correction:
                  'ㅇ ở ĐẦU là âm câm, nhưng ở ĐUÔI (Batchim) đọc là "-ng"!',
                tip: 'Ví dụ: 방 đọc là "bang" (phòng), 공 đọc là "gong" (bóng).',
              },
            ],
            studyTips: [
              'Tập viết các chữ 3 tầng (집, 밥, 물) bằng nút Tập viết để giữ tỉ lệ ô chữ vuông cân đối.',
            ],
          },
          vocabulary: [
            kw(
              '밥',
              '[밥 / bap]',
              'noun',
              'cơm, bữa ăn',
              '밥 먹어요.',
              'ㅂ ở dưới khép môi nhẹ thành âm p/b nhẹ.',
            ),
            kw(
              '집',
              '[집 / jip]',
              'noun',
              'nhà',
              '집에 가요.',
              'ㅈ + ㅣ + ㅂ = 집.',
            ),
            kw(
              '물',
              '[물 / mul]',
              'noun',
              'nước',
              '물 주세요.',
              'ㄹ ở cuối uốn nhẹ đầu lưỡi lên (âm L).',
            ),
            kw(
              '책',
              '[책 / chaek]',
              'noun',
              'quyển sách',
              '책을 읽어요.',
              'ㅊ bật hơi mạnh + ㅐ + ㄱ(-k).',
            ),
            kw(
              '방',
              '[방 / bang]',
              'noun',
              'căn phòng',
              '내 방이 넓어요.',
              'ㅇ ở cuối đọc thành vần -ng.',
            ),
            kw(
              '산',
              '[산 / san]',
              'noun',
              'ngọn núi',
              '산에 올라가요.',
              'ㅅ + ㅏ + ㄴ = san.',
            ),
          ],
          readingListening: {
            title: '받침 연습 · Thực hành đọc từ có Batchim',
            audioScript: '밥, 집, 물, 책, 방, 산. 물 주세요. 집에 가요.',
            translation:
              'Cơm, nhà, nước, sách, phòng, núi. Cho tôi nước. Tôi đi về nhà.',
            questions: [
              {
                id: 'koa0u3-q1',
                prompt:
                  'Chữ ㅇ khi đứng làm Batchim (ở dưới cùng, như "방") đọc là gì?',
                options: ['Âm câm', 'Vần "-ng"', 'Vần "-k"'],
                correctIndex: 1,
                explanation: 'ㅇ ở cuối âm tiết đọc thành "-ng" (방 = bang).',
              },
              {
                id: 'koa0u3-q2',
                prompt: 'Từ nào nghĩa là "nước"?',
                options: ['밥 (bap)', '물 (mul)', '산 (san)'],
                correctIndex: 1,
                explanation: '물 (mul) nghĩa là nước.',
              },
              {
                id: 'koa0u3-q3',
                prompt: 'Từ nào nghĩa là "nhà"?',
                options: ['집 (jip)', '책 (chaek)', '방 (bang)'],
                correctIndex: 0,
                explanation: '집 (jip) nghĩa là nhà.',
              },
            ],
          },
          writing: {
            prompt: 'Gõ và tập viết 3 chữ có âm cuối (gợi ý: "밥, 집, 물").',
            minSentences: 1,
            targetBand: 'Zero A0',
            targetTerms: ['밥', '집', '물'],
            sampleAnswer: '밥, 집, 물',
          },
          speakingTopicPrompt:
            'Practice pronouncing 1-syllable batchim words clearly: 밥, 집, 물, 책.',
        },
      ],
    },
    {
      partNumber: 2,
      title: 'Những câu nói đầu đời · Chào hỏi & Gọi món',
      subtitle:
        'Áp dụng ngay chữ Hangul vừa học vào các câu giao tiếp lịch sự, gọi đồ và tự giới thiệu',
      units: [
        {
          unitNumber: 4,
          slug: 'ko-a0-greetings',
          title: 'Xin chào, Cảm ơn & Xin lỗi (안녕·감사합니다)',
          topicName: '기초 인사 (Chào hỏi sơ cấp)',
          icon: 'home',
          themeColor: 'green',
          grammarFocus: 'Câu chào lịch sự dùng ngay + Vâng/Không (네/아니요)',
          studyGuide: {
            overview:
              'Sau khi đã ghép được chữ Hangul, hãy thuộc ngay 5 câu giao tiếp lịch sự nhất tại Hàn Quốc để mở lời tự tin ngay từ buổi đầu.',
            grammarPoints: [
              {
                title: 'Nối âm & Biến âm nhẹ trong câu chào quen thuộc',
                explanation:
                  'Trong "감사합니다", chữ ㅂ trước ㄴ được đọc tự nhiên thành "m" -> [감사함니다 / gamsahamnida].',
                example: '안녕하세요! 감사합니다.',
              },
            ],
            keyPatterns: [
              {
                pattern: '안녕하세요!',
                meaning:
                  'Xin chào! (lịch sự, dùng cho mọi lứa tuổi/tình huống)',
                example: '안녕하세요, 반가워요!',
              },
              {
                pattern: 'N + 주세요.',
                meaning: 'Làm ơn cho tôi [món gì đó].',
                example: '물 주세요. (Cho tôi xin nước.)',
              },
            ],
            commonMistakes: [
              {
                mistake:
                  'Quên thêm "요" hay "니다" khi nói với người lớn/người lạ',
                correction:
                  'Dùng "네" (Vâng), "감사합니다" (Cảm ơn) để giữ lịch sự chuẩn Hàn',
                tip: 'Cụm kết thúc bằng "-요" hoặc "-니다" luôn an toàn với mọi người.',
              },
            ],
            studyTips: [
              'Đọc to "안녕하세요" và thử bấm nút Luyện Nói AI với mức A0 chậm rãi.',
            ],
          },
          vocabulary: [
            kw(
              '안녕하세요',
              '[안녕하세요 / annyeonghaseyo]',
              'phrase',
              'xin chào (lịch sự)',
              '안녕하세요!',
              'Câu chào chuẩn mực và thân thiện nhất.',
            ),
            kw(
              '감사합니다',
              '[감사함니다 / gamsahamnida]',
              'phrase',
              'cảm ơn (lịch sự)',
              '도와주셔서 감사합니다.',
              'Cách nói cảm ơn phổ biến hàng đầu.',
            ),
            kw(
              '죄송합니다',
              '[죄송함니다 / joesonghamnida]',
              'phrase',
              'xin lỗi',
              '늦어서 죄송합니다.',
              'Dùng khi nhận lỗi lịch sự.',
            ),
            kw(
              '네',
              '[네 / ne]',
              'adverb',
              'vâng / dạ / đúng rồi',
              '네, 좋아요!',
              'Ngắn gọn và lịch sự.',
            ),
            kw(
              '아니요',
              '[아니요 / aniyo]',
              'adverb',
              'không / không phải đâu',
              '아니요, 괜찮아요.',
              'Từ chối nhẹ nhàng.',
            ),
            kw(
              '주세요',
              '[주세요 / juseyo]',
              'phrase',
              'làm ơn cho tôi...',
              '물 주세요.',
              'Cực kỳ hữu ích khi đi ăn uống/mua sắm.',
            ),
          ],
          readingListening: {
            title: '기본 인사 · Hội thoại chào hỏi 2 câu đầu tiên',
            audioScript:
              '안녕하세요! 네, 안녕하세요. 물 주세요. 여기 있어요. 감사합니다!',
            translation:
              'Xin chào! Vâng, xin chào. Cho tôi xin nước với ạ. Của bạn đây. Cảm ơn bạn!',
            questions: [
              {
                id: 'koa0u4-q1',
                prompt: 'Khi muốn cảm ơn một cách lịch sự, ta nói câu nào?',
                options: ['죄송합니다', '감사합니다', '아니요'],
                correctIndex: 1,
                explanation: '감사합니다 = Cảm ơn ạ.',
              },
              {
                id: 'koa0u4-q2',
                prompt: '"물 주세요" nghĩa là gì?',
                options: ['Tạm biệt', 'Cho tôi xin nước', 'Không có gì'],
                correctIndex: 1,
                explanation: '물 (nước) + 주세요 (cho tôi) = Cho tôi xin nước.',
              },
              {
                id: 'koa0u4-q3',
                prompt: 'Đáp "Vâng / Đúng rồi" lịch sự bằng 1 âm tiết là gì?',
                options: ['네', '물', '집'],
                correctIndex: 0,
                explanation: '네 (ne) = Vâng / Đúng rồi.',
              },
            ],
          },
          writing: {
            prompt:
              'Viết 1–2 câu chào và xin nước / cảm ơn bằng Hangul (gợi ý: "안녕하세요! 물 주세요. 감사합니다.").',
            minSentences: 1,
            targetBand: 'Zero A0',
            targetTerms: ['안녕하세요', '주세요', '감사합니다'],
            sampleAnswer: '안녕하세요! 물 주세요. 감사합니다.',
          },
          speakingTopicPrompt:
            'Say Annyeonghaseyo and ask for water politely with Juseyo.',
        },
        {
          unitNumber: 5,
          slug: 'ko-a0-food-numbers',
          title: 'Số đếm 하나·둘 & Gọi đồ uống (커피 주세요)',
          topicName: '주문과 숫자 (Số & Gọi đồ)',
          icon: 'globe',
          themeColor: 'cream',
          grammarFocus:
            'Số thuần Hàn 하나 (1), 둘 (2), 셋 (3) & hỏi giá 얼마예요',
          studyGuide: {
            overview:
              'Khi gọi đồ ở quán cà phê hay tiệm bánh Hàn Quốc, bạn chỉ cần ghép Tên món + 하나/둘 + 주세요 là gọi chuẩn như người bản xứ.',
            grammarPoints: [
              {
                title: 'Gọi 1 hoặc 2 món: 커피 하나 / 두 개 주세요',
                explanation:
                  '하나 (1), 둘 (2), 셋 (3) là số thuần Hàn dùng để đếm đồ vật đơn giản.',
                example: '커피 하나 주세요! (Cho 1 ly cà phê ạ!)',
              },
            ],
            keyPatterns: [
              {
                pattern: '[Đồ uống] + 하나 주세요.',
                meaning: 'Cho tôi một [đồ uống] ạ.',
                example: '아이스 커피 하나 주세요.',
              },
              {
                pattern: '얼마예요?',
                meaning: 'Bao nhiêu tiền ạ?',
                example: '빵 얼마예요? (Bánh mì bao nhiêu tiền ạ?)',
              },
            ],
            commonMistakes: [
              {
                mistake: 'Quên âm ㅃ/ㄲ ở từ vựng như "빵" (bánh mì)',
                correction:
                  '빵 (ppang) đọc bật hơi nhẹ dứt khoát không rung dây thanh quá lâu',
                tip: 'Nghe 0.8x để quen phụ âm căng ㅃ.',
              },
            ],
            studyTips: [
              'Thử đọc menu tiếng Hàn: 커피 (cà phê), 물 (nước), 빵 (bánh mì).',
            ],
          },
          vocabulary: [
            kw(
              '커피',
              '[커피 / keopi]',
              'noun',
              'cà phê',
              '커피 하나 주세요.',
              'Từ mượn từ "coffee" nên rất dễ nhớ!',
            ),
            kw(
              '빵',
              '[빵 / ppang]',
              'noun',
              'bánh mì / bánh ngọt',
              '빵이 맛있어요.',
              'Kết hợp ㅃ + ㅏ + ㅇ.',
            ),
            kw(
              '하나',
              '[하나 / hana]',
              'number',
              'một (đếm số lượng)',
              '물 하나 주세요.',
              'Số đếm 1 thuần Hàn.',
            ),
            kw(
              '둘',
              '[둘 / dul]',
              'number',
              'hai (khi đứng sau danh từ dùng 두 개)',
              '커피 둘, 빵 하나요.',
              'Số đếm 2 thuần Hàn.',
            ),
            kw(
              '얼마예요',
              '[얼마예요 / eolmayeyo]',
              'phrase',
              'bao nhiêu tiền ạ?',
              '이거 얼마예요?',
              'Câu hỏi giá cực kỳ ngắn gọn.',
            ),
            kw(
              '맛있어요',
              '[마시써요 / masisseoyo]',
              'adjective',
              'ngon quá',
              '김밥이 맛있어요!',
              'Phát âm nối âm thành [마시써요].',
            ),
          ],
          readingListening: {
            title: '카페에서 · Gọi món ở quán cà phê',
            audioScript:
              '안녕하세요! 커피 하나하고 빵 하나 주세요. 얼마예요? 오천 원이에요. 맛있어요! 감사합니다.',
            translation:
              'Xin chào! Cho tôi một cà phê và một bánh mì ạ. Bao nhiêu tiền vậy ạ? Năm nghìn won ạ. Ngon quá! Cảm ơn ạ.',
            questions: [
              {
                id: 'koa0u5-q1',
                prompt: 'Người nói đã gọi bao nhiêu ly cà phê?',
                options: ['하나 (Một)', '둘 (Hai)', '셋 (Ba)'],
                correctIndex: 0,
                explanation: '"커피 하나" = một cà phê.',
              },
              {
                id: 'koa0u5-q2',
                prompt: 'Câu "얼마예요?" dùng để hỏi gì?',
                options: ['Bạn tên gì?', 'Bao nhiêu tiền?', 'Bạn đi đâu đấy?'],
                correctIndex: 1,
                explanation: '얼마예요? = Bao nhiêu tiền ạ?',
              },
              {
                id: 'koa0u5-q3',
                prompt: 'Từ nào nghĩa là "bánh mì / bánh ngọt"?',
                options: ['물', '빵', '밥'],
                correctIndex: 1,
                explanation: '빵 (ppang) là bánh mì.',
              },
            ],
          },
          writing: {
            prompt:
              'Viết 1 câu gọi 1 ly cà phê hoặc bánh mì bằng Hangul (gợi ý: "커피 하나 주세요.").',
            minSentences: 1,
            targetBand: 'Zero A0',
            targetTerms: ['커피', '하나', '주세요'],
            sampleAnswer: '안녕하세요! 커피 하나 주세요. 빵도 맛있어요!',
          },
          speakingTopicPrompt:
            'Order one coffee or bread in Korean using 하나 주세요 and ask 얼마예요?',
        },
        {
          unitNumber: 6,
          slug: 'ko-a0-self-intro',
          title: 'Giới thiệu bản thân đầu tiên (저는 ...이에요)',
          topicName: '첫 자기소개 (Tự giới thiệu)',
          icon: 'target',
          themeColor: 'pink',
          grammarFocus: '저는 [Tên] + 이에요/예요 & 만나서 반가워요',
          studyGuide: {
            overview:
              'Ghép toàn bộ kiến thức từ Unit 1 đến Unit 5 để tự giới thiệu bản thân bằng tiếng Hàn lần đầu tiên: Tôi là ai, người nước nào và rất vui được gặp bạn.',
            grammarPoints: [
              {
                title: 'Đuôi câu "là": -이에요 vs -예요',
                explanation:
                  'Nếu danh từ kết thúc CÓ Batchim dùng -이에요 (학생이에요). Nếu KHÔNG Batchim dùng -예요 (베트남 사람... -> Có 받침 ㅁ nên là 사람이에요; 민지예요).',
                example: '저는 민지예요. 저는 학생이에요.',
              },
            ],
            keyPatterns: [
              {
                pattern: '저는 [Tên]이에요 / 예요.',
                meaning: 'Tôi là [Tên].',
                example: '안녕하세요, 저는 안이에요.',
              },
              {
                pattern: '저는 베트남 사람이에요.',
                meaning: 'Tôi là người Việt Nam.',
                example: '저는 베트남 사람이에요.',
              },
            ],
            commonMistakes: [
              {
                mistake: 'Lẫn -이에요 và -예요 (như "학생예요")',
                correction: '학생 (có Batchim ㅇ) -> 학생이에요',
                tip: 'Có đuôi dưới (Batchim) thì thêm chữ "이" ở giữa thành -이에요!',
              },
            ],
            studyTips: [
              'Hoàn thành bài này bạn đã sẵn sàng chuyển lên lộ trình TOPIK I · 1~2급!',
            ],
          },
          vocabulary: [
            kw(
              '저',
              '[저 / jeo]',
              'pronoun',
              'tôi (xưng hô lịch sự)',
              '저는 안이에요.',
              'Khiêm nhường và lịch sự hơn 나 (na).',
            ),
            kw(
              '이름',
              '[이름 / ireum]',
              'noun',
              'tên',
              '제 이름은 민호예요.',
              'Đọc nối nhẹ với 제 (của tôi).',
            ),
            kw(
              '학생',
              '[학쌩 / haksaeng]',
              'noun',
              'học sinh / sinh viên',
              '저는 학생이에요.',
              'Có batchim ㅇ nên đi với -이에요.',
            ),
            kw(
              '베트남',
              '[베트남 / Beteunam]',
              'noun',
              'Việt Nam',
              '베트남 음식은 맛있어요.',
              'Phiên âm chuẩn tiếng Hàn cho Việt Nam.',
            ),
            kw(
              '한국어',
              '[한구거 / hangugeo]',
              'noun',
              'tiếng Hàn Quốc',
              '저는 한국어를 좋아해요.',
              'Nối âm ㄱ sang ㅇ: [한구거].',
            ),
            kw(
              '좋아요',
              '[조아요 / joayo]',
              'adjective',
              'tốt, thích, hay',
              '한국어가 좋아요!',
              'Âm ㅎ đứng giữa bị lược nhẹ thành [조아요].',
            ),
          ],
          readingListening: {
            title: '첫 인사 · Lần đầu tự giới thiệu',
            audioScript:
              '안녕하세요! 저는 안이에요. 저는 베트남 사람이에요. 학생이에요. 한국어가 정말 좋아요!',
            translation:
              'Xin chào! Tôi là An. Tôi là người Việt Nam. Tôi là sinh viên. Tôi rất thích tiếng Hàn!',
            questions: [
              {
                id: 'koa0u6-q1',
                prompt: 'An là người nước nào?',
                options: ['한국 (Hàn Quốc)', '베트남 (Việt Nam)', '미국 (Mỹ)'],
                correctIndex: 1,
                explanation:
                  '"저는 베트남 사람이에요." = Tôi là người Việt Nam.',
              },
              {
                id: 'koa0u6-q2',
                prompt: 'Từ nào đi với "-이에요" đúng quy tắc có Batchim?',
                options: ['학생이에요', '커피이에요', '저이에요'],
                correctIndex: 0,
                explanation: '학생 kết thúc bằng batchim ㅇ nên dùng -이에요.',
              },
              {
                id: 'koa0u6-q3',
                prompt: '"한국어가 좋아요" thể hiện điều gì?',
                options: [
                  'Tôi mệt rồi',
                  'Tôi thích tiếng Hàn',
                  'Tôi đi về nhà',
                ],
                correctIndex: 1,
                explanation: '좋아요 nghĩa là thích / tốt.',
              },
            ],
          },
          writing: {
            prompt:
              'Viết 1–2 câu tự giới thiệu tên của bạn và bạn là người Việt Nam bằng Hangul (gợi ý: "안녕하세요! 저는 ...이에요. 베트남 사람이에요.").',
            minSentences: 1,
            targetBand: 'Zero A0',
            targetTerms: ['저', '베트남', '한국어'],
            sampleAnswer:
              '안녕하세요! 저는 안이에요. 베트남 사람이에요. 한국어가 좋아요!',
          },
          speakingTopicPrompt:
            'Say hello and introduce your name and that you are from Vietnam in 1–2 short Korean sentences.',
        },
      ],
    },
  ],
};
