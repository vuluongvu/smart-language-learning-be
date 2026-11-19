import type { SeedTrackSpec } from './learning-path.catalog.js';
import type { UnitVocabWord } from '../entities/learning-path-unit.entity.js';

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

export const KOREAN_LEARNING_PATH_CATALOG: SeedTrackSpec[] = [
  {
    code: 'topik_1_2',
    title: 'TOPIK I · 1~2급',
    cefrLevel: 'A2',
    languageCode: 'ko',
    summary:
      'Làm quen giao tiếp tiếng Hàn cơ bản hằng ngày: tự giới thiệu, gọi món, mua sắm, đi tàu điện ngầm và sinh hoạt với đuôi câu lịch sự -아요/-어요.',
    parts: [
      {
        partNumber: 1,
        title: '일상 기초 회화 · Giao tiếp hằng ngày',
        subtitle:
          'Chủ đề sơ cấp quen thuộc: chào hỏi, quán ăn, mua sắm và thói quen hằng ngày (TOPIK I)',
        units: [
          {
            unitNumber: 1,
            slug: 'ko-greetings-intro',
            title: '자기소개와 인사 · Chào hỏi & Tự giới thiệu',
            topicName: '자기소개 (Tự giới thiệu)',
            icon: 'home',
            themeColor: 'green',
            grammarFocus: 'Tiểu từ chủ ngữ -은/는, -이에요/예요 & 국적/직업',
            vocabulary: [
              kw(
                '안녕하세요',
                '[안ː녕하세요 / annyeonghaseyo]',
                'phrase',
                'xin chào (lịch sự, dùng hàng ngày)',
                '안녕하세요, 저는 민지예요.',
                'Câu chào phổ biến nhất trong hầu hết tình huống giao tiếp lịch sự.',
              ),
              kw(
                '이름',
                '[이름 / ireum]',
                'noun',
                'tên',
                '제 이름은 리나입니다.',
                'Dạng kính ngữ trang trọng là 성함 (seongham).',
              ),
              kw(
                '회사원',
                '[회사원 / hoesawon]',
                'noun',
                'nhân viên công ty',
                '저는 서울에서 일하는 회사원이에요.',
                'Hậu tố -원 chỉ thành viên / nhân viên trong tổ chức.',
              ),
              kw(
                '대학생',
                '[대학생 / daehaksaeng]',
                'noun',
                'sinh viên đại học',
                '제 동생은 한국어를 공부하는 대학생이에요.',
                'Kết hợp 대학 (đại học) + 학생 (học sinh).',
              ),
              kw(
                '반갑습니다',
                '[반갑씀니다 / bangapseumnida]',
                'phrase',
                'rất vui được gặp bạn',
                '만나서 정말 반갑습니다.',
                'Thường đi cùng 만나서 (vì được gặp) khi làm quen lần đầu.',
              ),
              kw(
                '취미',
                '[취미 / chwimi]',
                'noun',
                'sở thích',
                '제 취미는 한국 음악을 듣는 거예요.',
                'Mẫu quen thuộc: 제 취미는 N이에요/예요.',
              ),
            ],
            readingListening: {
              title: '첫 만남 인사 · Lần đầu gặp mặt',
              audioScript:
                '안녕하세요! 만나서 반갑습니다. 제 이름은 민수이고 한국 사람이에요. 저는 서울에서 일하는 회사원입니다. 제 취미는 주말에 공원에서 사진을 찍는 거예요. 여러분의 이름과 취미는 무엇이에요?',
              translation:
                'Xin chào! Rất vui được gặp các bạn. Tên tôi là Minsu và tôi là người Hàn Quốc. Tôi là nhân viên công ty làm việc tại Seoul. Sở thích của tôi là chụp ảnh ở công viên vào cuối tuần. Tên và sở thích của các bạn là gì?',
              questions: [
                {
                  id: 'q1',
                  prompt:
                    '민수 씨의 직업은 무엇이에요? (Nghề nghiệp của Minsu là gì?)',
                  options: [
                    '회사원 (Nhân viên công ty)',
                    '대학생 (Sinh viên)',
                    '요리사 (Đầu bếp)',
                    '의사 (Bác sĩ)',
                  ],
                  correctIndex: 0,
                  explanation:
                    'Bài nghe nói: "저는 서울에서 일하는 회사원입니다."',
                },
                {
                  id: 'q2',
                  prompt:
                    '민수 씨는 주말에 주로 무엇을 해요? (Cuối tuần Minsu thường làm gì?)',
                  options: [
                    '집에서 자요 (Ngủ ở nhà)',
                    '공원에서 사진을 찍어요 (Chụp ảnh ở công viên)',
                    '시장에서 쇼핑해요 (Đi chợ mua sắm)',
                    '학교에 가요 (Đi học)',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"제 취미는 주말에 공원에서 사진을 찍는 거예요."',
                },
                {
                  id: 'q3',
                  prompt: 'Từ nào sau đây có nghĩa là "rất vui được gặp bạn"?',
                  options: ['이름', '취미', '반갑습니다', '회사원'],
                  correctIndex: 2,
                  explanation:
                    '반갑습니다 dùng để bày tỏ niềm vui khi gặp ai đó lần đầu.',
                },
              ],
            },
            writing: {
              prompt:
                'Viết 3–5 câu tiếng Hàn tự giới thiệu tên, quốc tịch, nghề nghiệp hoặc học tập và sở thích của bạn.',
              minSentences: 3,
              targetBand: 'TOPIK I · 1~2급',
              targetTerms: ['안녕하세요', '이름', '취미'],
              sampleAnswer:
                '안녕하세요. 제 이름은 란이에요. 저는 베트남 사람이고 대학생이에요. 제 취미는 한국 드라마를 보는 거예요. 만나서 반갑습니다.',
            },
            speakingTopicPrompt:
              'Tự giới thiệu bản thân (tên, công việc/học tập, sở thích) và hỏi lại người bạn Hàn Quốc mới quen.',
          },
          {
            unitNumber: 2,
            slug: 'ko-cafe-restaurant',
            title: '카페와 식당 주문 · Gọi món ở quán cà phê & nhà hàng',
            topicName: '카페와 식당 (Quán ăn & Cà phê)',
            icon: 'sparkles',
            themeColor: 'cream',
            grammarFocus: 'Số đếm thuần Hàn, -주세요 (làm ơn cho) & -을/를',
            vocabulary: [
              kw(
                '메뉴',
                '[메뉴 / menyu]',
                'noun',
                'thực đơn',
                '메뉴 좀 보여 주세요.',
                'Dùng thêm 좀 để lời nhờ nghe nhẹ nhàng, tự nhiên.',
              ),
              kw(
                '주문하다',
                '[주문하다 / jumunhada]',
                'verb',
                'gọi món, đặt hàng',
                '지금 바로 주문할게요.',
                'Chia đuôi -아요/-어요 thành 주문해요.',
              ),
              kw(
                '아메리카노',
                '[아메리카노 / amerikano]',
                'noun',
                'cà phê Americano',
                '아이스 아메리카노 한 잔 주세요.',
                'Trong văn nói ở quán hay nói gọn là 아아 (아이스 아메리카노).',
              ),
              kw(
                '맛있다',
                '[마싣따 / masitda]',
                'adjective',
                'ngon',
                '이 비빔밥이 정말 맛있어요!',
                'Chia lịch sự: 맛있어요. Dạng đối nghĩa: 맛없어요.',
              ),
              kw(
                '얼마',
                '[얼마 / eolma]',
                'pronoun',
                'bao nhiêu (tiền/giá)',
                '이 케이크는 얼마예요?',
                'Hỏi giá: [Món đồ] 얼마예요?',
              ),
              kw(
                '계산하다',
                '[계산하다 / gyesanhada]',
                'verb',
                'thanh toán, tính tiền',
                '카드로 계산해도 돼요?',
                '카드로 = bằng thẻ; 현금으로 = bằng tiền mặt.',
              ),
            ],
            readingListening: {
              title: '카페에서 주문하기 · Gọi đồ ở quán cà phê Seoul',
              audioScript:
                '어서 오세요! 무엇을 주문하시겠어요? 저는 따뜻한 아메리카노 한 잔하고 치즈 케이크 하나 주세요. 모두 얼마예요? 아메리카노는 사천오백 원이고 케이크는 오천 원이에요. 카드로 계산할게요.',
              translation:
                'Xin chào quý khách! Quý khách muốn gọi gì ạ? Cho tôi một ly Americano nóng và một miếng bánh phô mai. Tổng cộng bao nhiêu tiền ạ? Americano 4.500 won và bánh 5.000 won ạ. Tôi thanh toán bằng thẻ nhé.',
              questions: [
                {
                  id: 'q1',
                  prompt: 'Khách hàng đã gọi những gì?',
                  options: [
                    'Trà xanh và bánh mì',
                    'Americano nóng và bánh phô mai',
                    'Cà phê đá và kem',
                    'Nước cam và cơm cuộn',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"따뜻한 아메리카노 한 잔하고 치즈 케이크 하나 주세요."',
                },
                {
                  id: 'q2',
                  prompt: 'Khách hàng thanh toán bằng cách nào?',
                  options: [
                    'Tiền mặt (현금)',
                    'Chuyển khoản',
                    'Thẻ (카드)',
                    'Phiếu giảm giá',
                  ],
                  correctIndex: 2,
                  explanation: 'Khách nói: "카드로 계산할게요."',
                },
                {
                  id: 'q3',
                  prompt: 'Mẫu câu nào dùng để hỏi giá tiền một món đồ?',
                  options: ['어디예요?', '누구예요?', '얼마예요?', '언제예요?'],
                  correctIndex: 2,
                  explanation: '얼마예요? nghĩa là "Bao nhiêu tiền vậy?".',
                },
              ],
            },
            writing: {
              prompt:
                'Viết một đoạn hội thoại ngắn hoặc 3–4 câu tiếng Hàn mô tả việc bạn gọi đồ uống và thanh toán tại quán cà phê.',
              minSentences: 3,
              targetBand: 'TOPIK I · 1~2급',
              targetTerms: ['주문하다', '얼마', '계산하다'],
              sampleAnswer:
                '주말에 친구하고 카페에 갔어요. 저는 아이스 아메리카노 한 잔을 주문했어요. 딸기 케이크도 정말 맛있었어요. 카드로 계산했어요.',
            },
            speakingTopicPrompt:
              'Đóng vai khách hàng gọi món tại quán cà phê hoặc quán ăn Hàn Quốc, hỏi giá và thanh toán.',
          },
          {
            unitNumber: 3,
            slug: 'ko-shopping-subway',
            title: '쇼핑과 지하철 · Mua sắm & Đi tàu điện ngầm',
            topicName: '쇼핑과 교통 (Mua sắm & Giao thông)',
            icon: 'globe',
            themeColor: 'lavender',
            grammarFocus:
              'Vị trí -에 / -에서, phương hướng & -아/어 보다 (thử làm)',
            vocabulary: [
              kw(
                '지하철',
                '[지하철 / jihacheol]',
                'noun',
                'tàu điện ngầm',
                '명동역까지 지하철로 이십 분 걸려요.',
                'Phương tiện đi lại chính ở Seoul, dùng trợ từ -(으)로.',
              ),
              kw(
                '갈아타다',
                '[가라타다 / garatada]',
                'verb',
                'chuyển tuyến, đổi xe/tàu',
                '시청역에서 2호선으로 갈아타세요.',
                'Đồng nghĩa Hán-Hàn là 환승하다.',
              ),
              kw(
                '할인',
                '[하린 / harin]',
                'noun',
                'giảm giá',
                '오늘 이 재킷은 이십 퍼센트 할인해요.',
                'Thường gặp trên biển hiệu: 할인 행사 (chương trình giảm giá).',
              ),
              kw(
                '입어 보다',
                '[이버 보다 / ibeo boda]',
                'phrase',
                'mặc thử',
                '이 코트를 한번 입어 봐도 돼요?',
                'Cấu trúc V-아/어 보다 diễn tả hành động thử làm gì.',
              ),
              kw(
                '오른쪽',
                '[오른쪽 / oreunjjok]',
                'noun',
                'bên phải',
                '삼 번 출구에서 오른쪽으로 가세요.',
                'Bên trái là 왼쪽 (oenjjok), đi thẳng là 직진 (jikjin).',
              ),
              kw(
                '가깝다',
                '[가깝따 / gakkapda]',
                'adjective',
                'gần',
                '지하철역이 집에서 아주 가까워요.',
                'Bất quy tắc ㅂ: 가깝다 + -아요/어요 -> 가까워요.',
              ),
            ],
            readingListening: {
              title: '홍대입구 가는 길 · Đường đến Hongdae mua sắm',
              audioScript:
                '저기요, 홍대입구역에 어떻게 가요? 여기서 지하철 2호선을 타면 한 번에 갈 수 있어요. 역에서 9번 출구로 나가서 오른쪽으로 조금만 걸어가면 옷 가게가 많아요. 이번 주말에는 큰 할인 행사도 해서 학생 손님이 아주 많아요.',
              translation:
                'Xin lỗi, đi đến ga Hongdae như thế nào ạ? Nếu đi tuyến tàu điện ngầm số 2 từ đây thì có thể đi thẳng một mạch. Ra ở cửa số 9 rồi rẽ phải đi bộ một chút là có nhiều tiệm quần áo. Cuối tuần này còn có đợt giảm giá lớn nên khách sinh viên rất đông.',
              questions: [
                {
                  id: 'q1',
                  prompt:
                    'Cần đi tuyến tàu điện ngầm số mấy để đến ga Hongdae?',
                  options: [
                    '1호선 (Tuyến 1)',
                    '2호선 (Tuyến 2)',
                    '4호선 (Tuyến 4)',
                    '9호선 (Tuyến 9)',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"여기서 지하철 2호선을 타면 한 번에 갈 수 있어요."',
                },
                {
                  id: 'q2',
                  prompt: 'Ra khỏi cửa số 9 thì rẽ hướng nào?',
                  options: [
                    '오른쪽 (Bên phải)',
                    '왼쪽 (Bên trái)',
                    '뒤쪽 (Phía sau)',
                    '지하 (Tầng hầm)',
                  ],
                  correctIndex: 0,
                  explanation:
                    '"9번 출구로 나가서 오른쪽으로 조금만 걸어가면..."',
                },
                {
                  id: 'q3',
                  prompt:
                    'Nếu bạn muốn mặc thử một chiếc áo khoác, bạn nói cụm động từ nào?',
                  options: ['갈아타다', '입어 보다', '계산하다', '주문하다'],
                  correctIndex: 1,
                  explanation:
                    '입어 보다 = mặc thử (từ động từ 입다 + -어 보다).',
                },
              ],
            },
            writing: {
              prompt:
                'Viết 3–4 câu tiếng Hàn kể về một lần bạn đi tàu điện ngầm hoặc đi mua sắm quần áo giảm giá.',
              minSentences: 3,
              targetBand: 'TOPIK I · 1~2급',
              targetTerms: ['지하철', '할인', '입어 보다'],
              sampleAnswer:
                '어제 지하철을 타고 백화점에 갔어요. 마음에 드는 코트를 한 번 입어 봤어요. 마침 할인해서 기분 좋게 샀어요.',
            },
            speakingTopicPrompt:
              'Hỏi đường tới ga tàu điện ngầm gần nhất hoặc trao đổi với nhân viên cửa hàng để mặc thử và hỏi giảm giá.',
          },
          {
            unitNumber: 4,
            slug: 'ko-daily-routine',
            title: '하루 일과와 주말 · Thói quen hằng ngày & Cuối tuần',
            topicName: '하루 일과 (Sinh hoạt hằng ngày)',
            icon: 'clock',
            themeColor: 'pink',
            grammarFocus:
              'Chia thì hiện tại -아/어요, quá khứ -았/었어요 & thời gian -에',
            vocabulary: [
              kw(
                '일어나다',
                '[이러나다 / ireonada]',
                'verb',
                'thức dậy',
                '저는 매일 아침 일곱 시에 일어나요.',
                'Kết thúc nguyên âm 아 -> 일어나요.',
              ),
              kw(
                '출근하다',
                '[출근하다 / chulgeunhada]',
                'verb',
                'đi làm',
                '보통 여덟 시 반에 회사에 출근해요.',
                'Tan làm là 퇴근하다 (toegeunhada).',
              ),
              kw(
                '운동하다',
                '[운동하다 / undonghada]',
                'verb',
                'tập thể dục, chơi thể thao',
                '퇴근한 후에 한강에서 운동해요.',
                'Các động từ -하다 luôn chia thành -해요.',
              ),
              kw(
                '약속',
                '[약쏙 / yaksok]',
                'noun',
                'cuộc hẹn, lời hứa',
                '토요일 오후에 친구와 약속이 있어요.',
                'Dùng với động từ 지키다 (giữ lời hứa) hoặc 있다/없다.',
              ),
              kw(
                '보통',
                '[보통 / botong]',
                'adverb',
                'thông thường, thường hay',
                '주말에는 보통 집에서 요리를 해요.',
                'Đứng đầu câu hoặc trước động từ chỉ thói quen.',
              ),
              kw(
                '쉬다',
                '[쉬다 / swida]',
                'verb',
                'nghỉ ngơi',
                '일요일에는 집에서 편하게 쉬었어요.',
                'Quá khứ: 쉬었어요.',
              ),
            ],
            readingListening: {
              title:
                '수진 씨의 평일과 주말 · Ngày thường và cuối tuần của Sujin',
              audioScript:
                '저는 평일에 아침 일곱 시에 일어나서 커피를 마셔요. 아홉 시에 출근해서 오후 여섯 시까지 일해요. 퇴근 후에는 건강을 위해 삼십 분쯤 운동해요. 하지만 토요일에는 친구와 저녁 약속이 있어서 맛있는 식당에 가고, 일요일에는 집에서 푹 쉬어요.',
              translation:
                'Ngày thường tôi dậy lúc 7 giờ sáng và uống cà phê. 9 giờ tôi đi làm và làm việc đến 6 giờ chiều. Sau khi tan làm, vì sức khỏe tôi tập thể dục khoảng 30 phút. Nhưng thứ Bảy có hẹn ăn tối với bạn nên đi nhà hàng ngon, còn Chủ nhật nghỉ ngơi thoải mái ở nhà.',
              questions: [
                {
                  id: 'q1',
                  prompt: 'Ngày thường Sujin thức dậy lúc mấy giờ?',
                  options: [
                    '6 giờ (여섯 시)',
                    '7 giờ (일곱 시)',
                    '8 giờ (여덟 시)',
                    '9 giờ (아홉 시)',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"저는 평일에 아침 일곱 시에 일어나서 커피를 마셔요."',
                },
                {
                  id: 'q2',
                  prompt: 'Sau khi tan làm Sujin làm gì?',
                  options: [
                    'Đi xem phim',
                    'Tập thể dục khoảng 30 phút',
                    'Ngủ sớm',
                    'Học nấu ăn',
                  ],
                  correctIndex: 1,
                  explanation: '"퇴근 후에는 건강을 위해 삼십 분쯤 운동해요."',
                },
                {
                  id: 'q3',
                  prompt: 'Ngày Chủ nhật Sujin làm gì?',
                  options: [
                    'Làm thêm giờ',
                    'Nghỉ ngơi ở nhà',
                    'Đi du lịch xa',
                    'Gặp đồng nghiệp',
                  ],
                  correctIndex: 1,
                  explanation: '"일요일에는 집에서 푹 쉬어요."',
                },
              ],
            },
            writing: {
              prompt:
                'Viết 4 câu tiếng Hàn kể về lịch trình buổi sáng và hoạt động cuối tuần yêu thích của bạn.',
              minSentences: 4,
              targetBand: 'TOPIK I · 1~2급',
              targetTerms: ['일어나다', '보통', '운동하다', '쉬다'],
              sampleAnswer:
                '저는 보통 아침 일곱 시에 일어나요. 여덟 시에 출근해서 열심히 일해요. 퇴근한 후에는 공원에서 가볍게 운동해요. 주말에는 집에서 책을 읽으면서 쉬어요.',
            },
            speakingTopicPrompt:
              'Kể cho bạn Hàn Quốc nghe thói quen một ngày của bạn và kế hoạch cuối tuần này.',
          },
        ],
      },
    ],
  },
  {
    code: 'topik_3_4',
    title: 'TOPIK II · 3~4급',
    cefrLevel: 'B1',
    languageCode: 'ko',
    summary:
      'Phát triển tiếng Hàn trung cấp cho công sở, du lịch và tình huống đời sống thực tế: dùng kính ngữ tự nhiên, trình bày lý do và diễn đạt kinh nghiệm.',
    parts: [
      {
        partNumber: 1,
        title: '실생활과 직장 한국어 · Thực tế & Công sở',
        subtitle:
          'Giao tiếp công ty, du lịch tự túc và chăm sóc sức khỏe trình độ Trung cấp (TOPIK 3–4급)',
        units: [
          {
            unitNumber: 1,
            slug: 'ko-workplace-honorifics',
            title: '직장 예절과 높임말 · Văn hoá công sở & Kính ngữ',
            topicName: '직장 생활 (Công sở Hàn Quốc)',
            icon: 'target',
            themeColor: 'lavender',
            grammarFocus:
              'Kính ngữ -(으)시- & câu nhờ vả lịch sự -아/어 주시겠어요?',
            vocabulary: [
              kw(
                '보고서',
                '[보고서 / bogoseo]',
                'noun',
                'báo cáo',
                '오후 두 시까지 월간 보고서를 제출해야 해요.',
                'Đi với động từ 작성하다 (soạn thảo), 제출하다 (nộp).',
              ),
              kw(
                '회의',
                '[회ː의 / hoeui]',
                'noun',
                'cuộc họp',
                '팀장님께서 잠깐 회의실로 오시라고 하셨어요.',
                '회의를 하다 (họp) hoặc 회의에 참석하다 (tham dự họp).',
              ),
              kw(
                '부탁드리다',
                '[부탁뜨리다 / butakdeurida]',
                'verb',
                'nhờ vả, xin phép (khiêm nhường)',
                '자료 검토 좀 부탁드립니다.',
                'Khiêm nhường ngữ của 부탁하다, dùng với cấp trên hoặc khách hàng.',
              ),
              kw(
                '출장',
                '[출짱 / chuljang]',
                'noun',
                'chuyến công tác',
                '다음 주에 부산으로 이박 삼일 출장을 가요.',
                '출장을 가다 = đi công tác; 출장을 오다 = đến công tác.',
              ),
              kw(
                '일정',
                '[일쩡 / iljeong]',
                'noun',
                'lịch trình',
                '내일 오후 일정을 다시 확인해 주시겠어요?',
                '일정을 잡다 (lên lịch), 일정을 조율하다 (điều phối lịch).',
              ),
              kw(
                '확인하다',
                '[화긴하다 / hwaginhada]',
                'verb',
                'kiểm tra, xác nhận',
                '이메일을 받으시면 바로 확인해 주세요.',
                'Kết hợp với -아/어 보다: 확인해 볼게요 (để tôi kiểm tra xem).',
              ),
            ],
            readingListening: {
              title:
                '팀장님께 일정 확인하기 · Xác nhận lịch trình với trưởng nhóm',
              audioScript:
                '팀장님, 다음 주 부산 출장 일정에 대해 말씀드리려고 합니다. 월요일 오전에 거래처와 중요한 회의가 잡혀 있습니다. 제가 작성한 보고서 초안을 이메일로 보내 드렸는데, 바쁘시겠지만 한 번 확인해 주시겠어요? 수정할 부분이 있으면 오늘 안으로 고쳐서 다시 보내 드리겠습니다.',
              translation:
                'Trưởng nhóm ơi, tôi muốn thưa chuyện về lịch trình công tác Busan tuần tới ạ. Sáng thứ Hai đã lên lịch một cuộc họp quan trọng với đối tác. Tôi đã gửi bản nháp báo cáo qua email rồi, dù anh/chị đang bận nhưng có thể kiểm tra giúp tôi một lần được không ạ? Nếu có chỗ cần sửa, tôi sẽ chỉnh ngay trong hôm nay và gửi lại ạ.',
              questions: [
                {
                  id: 'q1',
                  prompt:
                    'Nhân viên nói chuyện với trưởng nhóm về kế hoạch gì?',
                  options: [
                    'Xin nghỉ phép tuần tới',
                    'Lịch trình đi công tác Busan tuần tới',
                    'Tiệc liên hoan công ty',
                    'Tuyển thêm nhân sự mới',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"다음 주 부산 출장 일정에 대해 말씀드리려고 합니다."',
                },
                {
                  id: 'q2',
                  prompt:
                    'Người nói đã gửi gì qua email và nhờ trưởng nhóm làm gì?',
                  options: [
                    'Gửi vé máy bay để đặt lại',
                    'Gửi bản nháp báo cáo và nhờ kiểm tra giúp',
                    'Gửi hoá đơn để thanh toán',
                    'Gửi ảnh chụp cuộc họp trước',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"제가 작성한 보고서 초안을 이메일로 보내 드렸는데... 확인해 주시겠어요?"',
                },
                {
                  id: 'q3',
                  prompt:
                    'Cụm từ nào dùng để nhờ vả một cách khiêm nhường với cấp trên?',
                  options: ['부탁드리다', '출근하다', '쉬다', '약속하다'],
                  correctIndex: 0,
                  explanation: '부탁드리다 là dạng khiêm nhường của 부탁하다.',
                },
              ],
            },
            writing: {
              prompt:
                'Viết một đoạn ngắn (4 câu) giả định bạn gửi email hoặc nói chuyện lịch sự với đồng nghiệp/cấp trên về một cuộc họp và nhờ kiểm tra báo cáo.',
              minSentences: 4,
              targetBand: 'TOPIK II · 3~4급',
              targetTerms: ['회의', '보고서', '확인하다', '부탁드리다'],
              sampleAnswer:
                '과장님, 안녕하세요. 내일 오전 회의 자료를 준비해서 이메일로 보내 드렸습니다. 첨부한 보고서를 확인해 보시고 의견이 있으시면 말씀해 주세요. 바쁘시겠지만 검토 부탁드립니다.',
            },
            speakingTopicPrompt:
              'Thực hành trao đổi lịch họp, báo cáo hoặc kế hoạch công tác bằng kính ngữ lịch sự với đồng nghiệp Hàn Quốc.',
          },
          {
            unitNumber: 2,
            slug: 'ko-travel-booking',
            title: '한국 여행과 예약 · Du lịch Hàn Quốc & Đặt phòng',
            topicName: '한국 여행 (Du lịch Hàn Quốc)',
            icon: 'globe',
            themeColor: 'green',
            grammarFocus:
              'Dự định -(으)려고 하다 & trải nghiệm -(으)ㄴ 적이 있다',
            vocabulary: [
              kw(
                '예약하다',
                '[예야카다 / yeyakhada]',
                'verb',
                'đặt trước (vé, phòng, bàn)',
                '한 달 전에 제주도 숙소를 미리 예약했어요.',
                'Danh từ: 예약 (sự đặt trước), 예약 확인 (xác nhận đặt chỗ).',
              ),
              kw(
                '숙소',
                '[숙쏘 / sukso]',
                'noun',
                'chỗ ở, nơi lưu trú',
                '지하철역에서 가까운 숙소를 찾고 있어요.',
                'Bao gồm hotel, guesthouse, homestay, hanok stay.',
              ),
              kw(
                '관광지',
                '[관광지 / gwangwangji]',
                'noun',
                'địa điểm du lịch, thắng cảnh',
                '경복궁은 서울에서 가장 인기 있는 관광지 중 하나예요.',
                '관광객 = khách du lịch.',
              ),
              kw(
                '여권',
                '[여꿘 / yeogwon]',
                'noun',
                'hộ chiếu',
                '공항에 가기 전에 여권을 챙겼는지 꼭 확인하세요.',
                'Mặt hàng miễn thuế khi mua cần trình 여권.',
              ),
              kw(
                '추천하다',
                '[추천하다 / chucheonhada]',
                'verb',
                'gợi ý, đề xuất',
                '현지 맛집을 하나만 추천해 주시겠어요?',
                '맛집 = quán ăn ngon nổi tiếng.',
              ),
              kw(
                '경험',
                '[경험 / gyeongheom]',
                'noun',
                'trải nghiệm, kinh nghiệm',
                '한옥에서 하룻밤 자 본 경험이 정말 특별했어요.',
                'Hay dùng với -(으)ㄴ 적이 있다 để kể về trải nghiệm.',
              ),
            ],
            readingListening: {
              title: '가을 제주도 여행 계획 · Kế hoạch du lịch Jeju mùa thu',
              audioScript:
                '이번 가을에 가족과 함께 제주도에 가려고 해요. 성수기라서 한 달 전에 바다 전망이 보이는 숙소와 항공권을 미리 예약했어요. 작년에 경주에 가 본 적이 있는데 전통 한옥 체험이 참 인상적이었거든요. 제주도에 도착하면 현지 음식을 맛보고 예쁜 관광지도 많이 둘러볼 계획이에요.',
              translation:
                'Mùa thu này tôi định đi đảo Jeju cùng gia đình. Vì là mùa cao điểm nên tôi đã đặt trước chỗ ở hướng biển và vé máy bay từ một tháng trước. Năm ngoái tôi từng đi Gyeongju rồi và trải nghiệm nhà cổ Hanok rất ấn tượng. Khi đến Jeju tôi dự định thưởng thức ẩm thực địa phương và tham quan nhiều danh thắng đẹp.',
              questions: [
                {
                  id: 'q1',
                  prompt:
                    'Vì sao người nói đặt phòng và vé máy bay trước 1 tháng?',
                  options: [
                    'Vì sợ quên mang hộ chiếu',
                    'Vì là mùa cao điểm (성수기)',
                    'Vì công ty cử đi công tác',
                    'Vì muốn ở nhà truyền thống miễn phí',
                  ],
                  correctIndex: 1,
                  explanation: '"성수기라서 한 달 전에... 미리 예약했어요."',
                },
                {
                  id: 'q2',
                  prompt:
                    'Trải nghiệm năm ngoái ở Gyeongju khiến người nói ấn tượng là gì?',
                  options: [
                    'Leo núi tuyết',
                    'Trải nghiệm nhà cổ Hanok (전통 한옥 체험)',
                    'Mua sắm đồ điện tử',
                    'Xem bóng đá',
                  ],
                  correctIndex: 1,
                  explanation: '"전통 한옥 체험이 참 인상적이었거든요."',
                },
                {
                  id: 'q3',
                  prompt: 'Động từ nào có nghĩa là "gợi ý / giới thiệu"?',
                  options: ['예약하다', '추천하다', '출근하다', '갈아타다'],
                  correctIndex: 1,
                  explanation:
                    '추천하다 dùng khi muốn nhờ ai đó gợi ý địa điểm hay món ăn.',
                },
              ],
            },
            writing: {
              prompt:
                'Viết 4–5 câu tiếng Hàn về một địa điểm bạn từng đến hoặc dự định đi du lịch sắp tới.',
              minSentences: 4,
              targetBand: 'TOPIK II · 3~4급',
              targetTerms: ['예약하다', '숙소', '경험', '추천하다'],
              sampleAnswer:
                '다음 달에 부산으로 여행을 가려고 해요. 바닷가 근처에 있는 조용한 숙소를 벌써 예약했어요. 작년에 서울에 갔을 때 한복을 입어 본 경험이 아주 즐거웠어요. 부산에 맛있는 식당이 있으면 추천해 주세요.',
            },
            speakingTopicPrompt:
              'Chia sẻ kế hoạch du lịch Hàn Quốc của bạn và hỏi người bản xứ gợi ý món ăn, chỗ ở hoặc địa điểm đẹp.',
          },
          {
            unitNumber: 3,
            slug: 'ko-health-clinic',
            title: '건강과 병원 · Sức khoẻ & Đi khám bệnh',
            topicName: '건강과 병원 (Sức khoẻ & Bệnh viện)',
            icon: 'flame',
            themeColor: 'pink',
            grammarFocus:
              'Nguyên nhân -기 때문에 & lời khuyên -(으)면 안 되다 / -는 게 좋다',
            vocabulary: [
              kw(
                '감기에 걸리다',
                '[감기에 걸리다 / gamgie geollida]',
                'phrase',
                'bị cảm lạnh',
                '환절기라서 감기에 걸리는 사람이 많아요.',
                'Dùng tiểu từ -에 với động từ 걸리다 (mắc bệnh).',
              ),
              kw(
                '증상',
                '[증상 / jeungsang]',
                'noun',
                'triệu chứng',
                '언제부터 이런 증상이 시작되었나요?',
                'Các triệu chứng hay gặp: 열이 나다 (sốt), 기침하다 (ho).',
              ),
              kw(
                '처방전',
                '[처방전 / cheobangjeon]',
                'noun',
                'đơn thuốc (của bác sĩ)',
                '병원에서 처방전을 받아서 약국에 갔어요.',
                'Ở Hàn Quốc, khám ở 병원 (phòng khám) rồi mua thuốc ở 약국.',
              ),
              kw(
                '약국',
                '[약꾹 / yakguk]',
                'noun',
                'hiệu thuốc',
                '식사 후 삼십 분 뒤에 약국에서 받은 약을 드세요.',
                '식후 30분 = sau bữa ăn 30 phút.',
              ),
              kw(
                '푹 쉬다',
                '[푹 쉬다 / puk swida]',
                'phrase',
                'nghỉ ngơi thật kỹ, nghỉ xả hơi',
                '며칠 동안 무리하지 말고 집에서 푹 쉬세요.',
                'Phó từ 푹 nhấn mạnh mức độ sâu, trọn vẹn (푹 자다 = ngủ say).',
              ),
              kw(
                '건강 관리',
                '[건강 관리 / geongang gwalli]',
                'noun',
                'chăm sóc / quản lý sức khoẻ',
                '규칙적인 수면이 건강 관리에 가장 중요해요.',
                '관리 = quản lý, giữ gìn.',
              ),
            ],
            readingListening: {
              title: '병원 진료실 대화 · Tại phòng khám bác sĩ',
              audioScript:
                '어디가 불편해서 오셨어요? 어제부터 목이 아프고 열이 조금 나서 왔어요. 요즘 일교차가 심하기 때문에 감기에 걸리기 쉽습니다. 심한 편은 아니지만 무리하면 안 되고 따뜻한 물을 자주 마시는 게 좋아요. 처방전을 드릴 테니 약국에서 약을 지어 드시고 며칠 푹 쉬세요.',
              translation:
                'Anh/chị thấy khó chịu ở đâu ạ? Từ hôm qua tôi bị đau họng và hơi sốt nên tới khám. Dạo này chênh lệch nhiệt độ ngày đêm lớn nên rất dễ bị cảm. Không quá nặng nhưng không được làm quá sức và nên uống nước ấm thường xuyên. Tôi sẽ kê đơn thuốc để anh/chị ra hiệu thuốc lấy rồi nghỉ ngơi thật tốt vài ngày.',
              questions: [
                {
                  id: 'q1',
                  prompt: 'Bệnh nhân có những triệu chứng gì từ hôm qua?',
                  options: [
                    'Đau răng và đau bụng',
                    'Đau họng và hơi sốt (목이 아프고 열이 나다)',
                    'Đau chân vì chạy bộ',
                    'Chóng mặt do mất ngủ',
                  ],
                  correctIndex: 1,
                  explanation: '"어제부터 목이 아프고 열이 조금 나서 왔어요."',
                },
                {
                  id: 'q2',
                  prompt: 'Bác sĩ khuyên bệnh nhân nên làm gì?',
                  options: [
                    'Uống nước lạnh và tập nặng',
                    'Uống nước ấm, lấy thuốc theo đơn và nghỉ ngơi kỹ',
                    'Đi làm thêm ngoài giờ',
                    'Nhịn ăn buổi tối',
                  ],
                  correctIndex: 1,
                  explanation:
                    'Bác sĩ khuyên uống nước ấm, lấy thuốc bằng 처방전 và 푹 쉬세요.',
                },
                {
                  id: 'q3',
                  prompt:
                    'Nhận đơn thuốc (처방전) xong ở Hàn Quốc cần tới đâu để mua thuốc?',
                  options: ['식당', '지하철역', '약국', '우체국'],
                  correctIndex: 2,
                  explanation: '약국 là hiệu thuốc.',
                },
              ],
            },
            writing: {
              prompt:
                'Viết 4 câu tiếng Hàn mô tả cách bạn giữ gìn sức khoẻ hoặc lời khuyên khi bị cảm lạnh.',
              minSentences: 4,
              targetBand: 'TOPIK II · 3~4급',
              targetTerms: ['감기에 걸리다', '증상', '푹 쉬다', '건강 관리'],
              sampleAnswer:
                '요즘 날씨가 갑자기 추워져서 감기에 걸리기 쉬워요. 목이 아프거나 기침 같은 증상이 있으면 일찍 병원에 가야 해요. 무엇보다 따뜻한 물을 마시고 푹 쉬는 것이 중요해요. 평소에도 꾸준한 운동으로 건강 관리를 해야 해요.',
            },
            speakingTopicPrompt:
              'Mô tả triệu chứng sức khoẻ khi đi khám hoặc trao đổi thói quen giữ gìn sức khoẻ hằng ngày.',
          },
        ],
      },
    ],
  },
  {
    code: 'topik_5_6',
    title: 'TOPIK II · 5~6급',
    cefrLevel: 'C1',
    languageCode: 'ko',
    summary:
      'Làm chủ tiếng Hàn học thuật và thảo luận xã hội cấp độ TOPIK 5–6급: phân tích hai mặt vấn đề, lập luận logic cho bài viết nghị luận TOPIK Câu 54.',
    parts: [
      {
        partNumber: 1,
        title: '사회 이슈와 고급 논술 · Thảo luận xã hội & Nghị luận',
        subtitle:
          'Từ vựng Hán-Hàn nâng cao & cấu trúc viết lập luận mạch lạc (TOPIK 5–6급)',
        units: [
          {
            unitNumber: 1,
            slug: 'ko-tech-modern-society',
            title: '기술과 현대 사회 · Công nghệ & Đời sống hiện đại',
            topicName: '기술과 사회 (Công nghệ & Xã hội)',
            icon: 'sparkles',
            themeColor: 'lavender',
            grammarFocus:
              'Tương phản -는 반면에, nguyên nhân -(으)로 인해 & đánh giá -다고 볼 수 있다',
            vocabulary: [
              kw(
                '인공지능',
                '[인공지능 / ingongjineung]',
                'noun',
                'trí tuệ nhân tạo (AI)',
                '인공지능 기술이 업무 방식에 큰 변화를 가져오고 있다.',
                'Từ Hán-Hàn (Nhân công trí năng).',
              ),
              kw(
                '효율성',
                '[효율썽 / hyoyulseong]',
                'noun',
                'tính hiệu quả, hiệu suất',
                '자동화 시스템 덕분에 생산 효율성이 크게 높아졌다.',
                'Hậu tố -성 mang nghĩa "tính chất".',
              ),
              kw(
                '의존하다',
                '[의존하다 / uijonhada]',
                'verb',
                'phụ thuộc, ỷ lại vào',
                '디지털 기기에 지나치게 의존하는 것은 바람직하지 않다.',
                'Đi với tiểu từ -에: N에 의존하다.',
              ),
              kw(
                '개인 정보',
                '[개인 정보 / gaein jeongbo]',
                'noun',
                'thông tin cá nhân',
                '온라인 서비스를 이용할 때 개인 정보 보호가 필수적이다.',
                '개인 정보 유출 = rò rỉ thông tin cá nhân.',
              ),
              kw(
                '장단점',
                '[장단쩜 / jangdanjeom]',
                'noun',
                'ưu và nhược điểm',
                '새로운 기술에는 분명한 장단점이 공존한다.',
                '장점 (ưu điểm) + 단점 (nhược điểm).',
              ),
              kw(
                '변화하다',
                '[변화하다 / byeonhwahada]',
                'verb',
                'biến đổi, thay đổi',
                '기술의 발전으로 사람들의 소통 방식도 빠르게 변화하고 있다.',
                'Danh từ hóa: 변화 (sự thay đổi).',
              ),
            ],
            readingListening: {
              title: '디지털 시대의 양면성 · Hai mặt của kỷ nguyên số',
              audioScript:
                '최근 인공지능과 디지털 기술이 빠르게 발전하면서 우리의 일상생활도 크게 변화하고 있다. 이러한 기술은 반복적인 업무를 줄여 주어 일의 효율성을 높여 주는 반면에, 개인 정보 유출이나 과도한 기술 의존이라는 부작용을 낳기도 한다. 따라서 기술의 장단점을 균형 있게 바라보고, 올바른 활용 기준을 세우는 노력이 필요하다고 볼 수 있다.',
              translation:
                'Gần đây khi công nghệ số và trí tuệ nhân tạo phát triển nhanh chóng, đời sống hằng ngày cũng thay đổi sâu sắc. Dù công nghệ giúp giảm công việc lặp lại và nâng cao hiệu suất, mặt khác lại phát sinh tác dụng phụ như rò rỉ thông tin cá nhân hay sự lệ thuộc quá mức. Vì vậy có thể thấy nỗ lực nhìn nhận cân bằng ưu nhược điểm và xây dựng chuẩn mực sử dụng đúng đắn là rất cần thiết.',
              questions: [
                {
                  id: 'q1',
                  prompt:
                    'Theo đoạn văn, lợi ích chính mà công nghệ mang lại là gì?',
                  options: [
                    'Xoá bỏ hoàn toàn mọi công việc của con người',
                    'Giảm tác vụ lặp lại và nâng cao hiệu suất (효율성을 높여 주다)',
                    'Giúp mọi người không cần giao tiếp',
                    'Loại bỏ vấn đề bảo mật',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"반복적인 업무를 줄여 주어 일의 효율성을 높여 주는 반면에..."',
                },
                {
                  id: 'q2',
                  prompt:
                    'Tác dụng phụ (부작용) được nhắc tới trong đoạn văn là gì?',
                  options: [
                    'Thiếu điện sinh hoạt',
                    'Rò rỉ thông tin cá nhân và lệ thuộc quá mức vào công nghệ',
                    'Giá thiết bị giảm quá nhanh',
                    'Khó tìm tài liệu học tập',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"개인 정보 유출이나 과도한 기술 의존이라는 부작용..."',
                },
                {
                  id: 'q3',
                  prompt: 'Cấu trúc "-는 반면에" diễn đạt quan hệ ý nghĩa nào?',
                  options: [
                    'Mục đích',
                    'Tương phản hai mặt',
                    'Giả định tương lai',
                    'Trình tự thời gian',
                  ],
                  correctIndex: 1,
                  explanation: '-는 반면에 dùng để nối hai vế tương phản nhau.',
                },
              ],
            },
            writing: {
              prompt:
                'Viết một đoạn văn 4–5 câu tiếng Hàn (văn phong -다/는다 hoặc -아요/어요 lịch sự) phân tích hai mặt tích cực và hạn chế của AI trong học tập/công việc.',
              minSentences: 4,
              targetBand: 'TOPIK II · 5~6급',
              targetTerms: ['인공지능', '효율성', '의존하다', '장단점'],
              sampleAnswer:
                '인공지능 기술은 학습과 업무의 효율성을 크게 향상시켜 준다. 필요한 정보를 빠르게 찾고 맞춤형 피드백을 받을 수 있다는 점이 큰 장점이다. 반면에 기술에 지나치게 의존할 경우 스스로 사고하는 힘이 약해질 수 있다. 따라서 장단점을 고려하여 주체적으로 활용하는 태도가 중요하다고 본다.',
            },
            speakingTopicPrompt:
              'Thảo luận quan điểm cá nhân về lợi ích và rủi ro của trí tuệ nhân tạo đối với công việc và quyền riêng tư.',
          },
          {
            unitNumber: 2,
            slug: 'ko-environment-sustainability',
            title: '환경과 지속 가능성 · Môi trường & Phát triển bền vững',
            topicName: '환경 보호 (Bảo vệ môi trường)',
            icon: 'book-open',
            themeColor: 'green',
            grammarFocus:
              'Bổ sung -(으)ㄹ 뿐만 아니라 & quy luật tất yếu -기 마련이다',
            vocabulary: [
              kw(
                '기후 변화',
                '[기후 변화 / gihu byeonhwa]',
                'noun',
                'biến đổi khí hậu',
                '기후 변화로 인해 전 세계적으로 이상 기온 현상이 잦아졌다.',
                'Thường đi kèm -(으)로 인해 (do/vì nguyên nhân...).',
              ),
              kw(
                '재활용',
                '[재화룡 / jaehwaryong]',
                'noun',
                'tái chế',
                '분리수거를 철저히 해야 재활용률을 높일 수 있다.',
                '분리수거 = phân loại rác tái chế (rất quan trọng ở Hàn Quốc).',
              ),
              kw(
                '친환경',
                '[친환경 / chinhwangyeong]',
                'noun',
                'thân thiện với môi trường',
                '최근 친환경 제품을 선호하는 소비자가 늘고 있다.',
                'Tiền tố 친- mang nghĩa thân thiện, gần gũi.',
              ),
              kw(
                '줄이다',
                '[주리다 / jurida]',
                'verb',
                'cắt giảm, làm giảm xuống',
                '일회용품 사용을 줄이는 작은 습관이 큰 변화를 만든다.',
                '일회용품 = đồ dùng một lần.',
              ),
              kw(
                '실천하다',
                '[실천하다 / silcheonhada]',
                'verb',
                'thực hành, áp dụng vào thực tế',
                '환경 보호는 말보다 행동으로 실천하는 것이 중요하다.',
                'Thường đi cùng kế hoạch/lời hứa: 계획을 실천하다.',
              ),
              kw(
                '지속 가능하다',
                '[지속 가능하다 / jisok ganeunghada]',
                'adjective',
                'bền vững, có thể duy trì lâu dài',
                '기업과 개인 모두가 지속 가능한 소비 문화를 만들어 가야 한다.',
                '지속 가능성 = tính bền vững.',
              ),
            ],
            readingListening: {
              title:
                '지속 가능한 내일을 위한 선택 · Lựa chọn cho tương lai bền vững',
              audioScript:
                '심각해지는 기후 변화 문제는 특정 국가만의 과제가 아니라 인류 전체가 함께 풀어야 할 숙제이다. 일회용품을 줄이고 재활용을 생활화하는 일은 환경을 지킬 뿐만 아니라 자원을 아끼는 데에도 도움이 된다. 정부와 기업의 제도적 지원과 더불어 개인이 일상에서 친환경 습관을 꾸준히 실천할 때 비로소 지속 가능한 미래가 가능해질 것이다.',
              translation:
                'Biến đổi khí hậu ngày càng nghiêm trọng không chỉ là bài toán của riêng một quốc gia mà là nhiệm vụ chung của toàn nhân loại. Việc giảm đồ dùng một lần và biến tái chế thành nếp sống không những bảo vệ môi trường mà còn tiết kiệm tài nguyên. Chỉ khi có sự hỗ trợ về chính sách từ chính phủ, doanh nghiệp cùng với việc mỗi cá nhân kiên trì thực hành thói quen xanh hằng ngày, tương lai bền vững mới trở thành hiện thực.',
              questions: [
                {
                  id: 'q1',
                  prompt:
                    'Theo đoạn văn, lợi ích của việc giảm đồ dùng một lần và tái chế là gì?',
                  options: [
                    'Chỉ giúp tiết kiệm tiền cho doanh nghiệp',
                    'Không chỉ bảo vệ môi trường mà còn giúp tiết kiệm tài nguyên',
                    'Làm tăng lượng rác thải sinh hoạt',
                    'Chỉ có tác dụng ở các thành phố lớn',
                  ],
                  correctIndex: 1,
                  explanation:
                    '"환경을 지킬 뿐만 아니라 자원을 아끼는 데에도 도움이 된다."',
                },
                {
                  id: 'q2',
                  prompt:
                    'Để tương lai bền vững thành hiện thực cần sự kết hợp của ai?',
                  options: [
                    'Chỉ mình chính phủ',
                    'Chỉ học sinh sinh viên',
                    'Chính phủ, doanh nghiệp và thói quen thực hành của từng cá nhân',
                    'Các công ty du lịch',
                  ],
                  correctIndex: 2,
                  explanation:
                    '"정부와 기업의 제도적 지원과 더불어 개인이... 실천할 때..."',
                },
                {
                  id: 'q3',
                  prompt: 'Cấu trúc "-(으)ㄹ 뿐만 아니라" dùng để làm gì?',
                  options: [
                    'Phủ định toàn bộ mệnh đề trước',
                    'Bổ sung thêm ý ("không chỉ... mà còn...")',
                    'Diễn tả sự hối tiếc',
                    'Ra lệnh trực tiếp',
                  ],
                  correctIndex: 1,
                  explanation: '-(으)ㄹ 뿐만 아니라 = không những A mà còn B.',
                },
              ],
            },
            writing: {
              prompt:
                'Viết 4–5 câu tiếng Hàn trình bày lý do cần bảo vệ môi trường và 1–2 hành động cụ thể bạn có thể thực hiện hằng ngày.',
              minSentences: 4,
              targetBand: 'TOPIK II · 5~6급',
              targetTerms: ['기후 변화', '줄이다', '재활용', '실천하다'],
              sampleAnswer:
                '최근 기후 변화로 인해 자연재해가 늘어나고 있어 환경 보호가 그 어느 때보다 중요해졌다. 환경 문제는 개인의 작은 노력과 사회적 협력이 함께 이루어질 때 해결할 수 있다. 먼저 일상에서 일회용품 사용을 줄이고 분리수거와 재활용을 철저히 해야 한다. 이러한 습관을 꾸준히 실천한다면 더욱 지속 가능한 사회를 만들 수 있을 것이다.',
            },
            speakingTopicPrompt:
              'Trình bày quan điểm về trách nhiệm bảo vệ môi trường và những thói quen xanh hiệu quả nhất trong đời sống hằng ngày.',
          },
        ],
      },
    ],
  },
];
