const fs = require('fs');
const path = require('path');

const locales = ['en', 'vi', 'ko'];

const updatesEn = {
  ArticleHero: {
    latestNews: "Latest News",
    guide: "Guide"
  },
  ExtraServicesGuide: {
    fastTrack: {
      noteTitle: "Please prepare the stamping fee in cash (USD):",
      note1: "for 1 month / 3 months / 6 months single entry visa.",
      note2: "for 1 month / 3 months multiple entry visa.",
      note3: "for 6 months / 1 year multiple entry visa."
    },
    carPickup: {
      table: {
        economicClass: "Economic Class",
        businessClass: "Business Class",
        fordTransit: "Ford Transit, Mercedes Transit..",
        huyndai: "Huyndai, Daewoo..",
        civic: "Civic, Chervolet, Altis, Vios..",
        camry: "Camry, Mercedes, BMW, Audi..",
        innova: "Innova, Chervolet..",
        mercedes: "Mercedes, BMW, Audi..",
        contact: "Contact"
      }
    }
  },
  VisaExemptionsGuide: {
    countries: {
      cl: "Chile", pa: "Panama", kh: "Cambodia", id: "Indonesia", kg: "Kyrgyz",
      la: "Laos", my: "Malaysia", sg: "Singapore", th: "Thailand", ph: "Philippines",
      bn: "Brunei", mm: "Myanmar", by: "Belarus", kr: "Korea", jp: "Japan",
      de: "Germany", dk: "Denmark", no: "Norway", ru: "Russia", fr: "France",
      fi: "Finland", es: "Spain", se: "Sweden", it: "Italy", gb: "United Kingdom"
    },
    days: "{count} days",
    otherCases: {
      diplomatic: { title: "Diplomatic Passports", desc: "Entering Vietnam for official purposes." },
      trc: { title: "Temporary Residence Card", desc: "Can enter and stay up to the length of the temporary residence card." },
      vec: { title: "Visa Exemption Certificate", desc: "Can enter and stay up to 180 days." },
      apec: { title: "APEC Cards", desc: "Valid passport holders with APEC cards can enter and stay up to 60 days." },
      sez: { title: "Special Economic Zones", desc: "E.g., Phu Quoc Island. Can enter and stay up to 30 days." }
    },
    extension: {
      rules: {
        bilateral: { title: "Bilateral Visa Exemption", desc: "Must exit Vietnam after the stay expires, then re-enter if a longer stay is needed." },
        unilateral: { title: "Unilateral Visa Exemption", desc: "After the allowed stay expires, it is possible to extend for an additional 15 days." },
        vec: { title: "Visa Exemption Certificate", desc: "Can extend for another 180 days with a valid guarantor in Vietnam and a justified reason." }
      },
      note: "Note: All temporary residence extensions are processed at the Immigration Department of Vietnam.",
      whyUsFeatures: {
        fast: { title: "Fast Processing", desc: "Get your results quickly within 3-5 working days. We support the entire process from preparation to completion." },
        accuracy: { title: "100% Accuracy", desc: "Our experts prepare documents quickly and ensure 100% accuracy for a successful extension." },
        convenience: { title: "Convenience", desc: "No need to visit authorities. We collect documents and deliver results directly to your address in Vietnam." }
      },
      contactBtn: "Contact Us for Extension"
    }
  },
  VisaExtensionGuide: {
    whyUsFeatures: {
      noTravel: { title: "No Travel Required", desc: "We handle the submission and pickup for you." },
      guaranteed: { title: "Guaranteed Result", desc: "10+ years experience dealing with Immigration Department." },
      noHidden: { title: "No Hidden Fees", desc: "Transparent pricing upfront, no extra charges." },
      fast: { title: "Fast Processing", desc: "Urgent services available for tight deadlines." }
    },
    faqs: {
      q1: { q: "How long does it take to extend a visa?", a: "The standard processing time is 5-7 working days. However, we also offer urgent processing options if your visa is about to expire." },
      q2: { q: "Can I extend my E-Visa?", a: "No, currently the Vietnam Immigration Department does not allow extensions for E-Visas. You must exit the country and apply for a new visa." },
      q3: { q: "What is the overstay penalty?", a: "Overstaying your visa will result in administrative fines starting from 500,000 VND to 20,000,000 VND depending on the number of days overstayed, and possible deportation or blacklisting." }
    }
  }
};

const updatesVi = {
  ArticleHero: {
    latestNews: "Tin Tức Mới Nhất",
    guide: "Hướng Dẫn"
  },
  ExtraServicesGuide: {
    fastTrack: {
      noteTitle: "Vui lòng chuẩn bị phí dán tem bằng tiền mặt (USD):",
      note1: "cho visa nhập cảnh 1 lần loại 1 tháng / 3 tháng / 6 tháng.",
      note2: "cho visa nhập cảnh nhiều lần loại 1 tháng / 3 tháng.",
      note3: "cho visa nhập cảnh nhiều lần loại 6 tháng / 1 năm."
    },
    carPickup: {
      table: {
        economicClass: "Hạng Phổ Thông",
        businessClass: "Hạng Thương Gia",
        fordTransit: "Ford Transit, Mercedes Transit..",
        huyndai: "Huyndai, Daewoo..",
        civic: "Civic, Chervolet, Altis, Vios..",
        camry: "Camry, Mercedes, BMW, Audi..",
        innova: "Innova, Chervolet..",
        mercedes: "Mercedes, BMW, Audi..",
        contact: "Liên Hệ"
      }
    }
  },
  VisaExemptionsGuide: {
    countries: {
      cl: "Chile", pa: "Panama", kh: "Campuchia", id: "Indonesia", kg: "Kyrgyzstan",
      la: "Lào", my: "Malaysia", sg: "Singapore", th: "Thái Lan", ph: "Philippines",
      bn: "Brunei", mm: "Myanmar", by: "Belarus", kr: "Hàn Quốc", jp: "Nhật Bản",
      de: "Đức", dk: "Đan Mạch", no: "Na Uy", ru: "Nga", fr: "Pháp",
      fi: "Phần Lan", es: "Tây Ban Nha", se: "Thụy Điển", it: "Ý", gb: "Vương quốc Anh"
    },
    days: "{count} ngày",
    otherCases: {
      diplomatic: { title: "Hộ chiếu Ngoại giao", desc: "Nhập cảnh Việt Nam vì mục đích công vụ." },
      trc: { title: "Thẻ Tạm Trú", desc: "Được nhập cảnh và lưu trú theo thời hạn của thẻ tạm trú." },
      vec: { title: "Giấy Miễn Thị Thực", desc: "Được nhập cảnh và lưu trú tối đa 180 ngày." },
      apec: { title: "Thẻ APEC", desc: "Người mang thẻ APEC cùng hộ chiếu hợp lệ được nhập cảnh và lưu trú tối đa 60 ngày." },
      sez: { title: "Đặc Khu Kinh Tế", desc: "Ví dụ: Đảo Phú Quốc. Được nhập cảnh và lưu trú tối đa 30 ngày." }
    },
    extension: {
      rules: {
        bilateral: { title: "Miễn Thị Thực Song Phương", desc: "Phải xuất cảnh Việt Nam sau khi hết hạn lưu trú, sau đó nhập cảnh lại nếu muốn ở lâu hơn." },
        unilateral: { title: "Miễn Thị Thực Đơn Phương", desc: "Sau khi hết thời hạn lưu trú, có thể gia hạn thêm 15 ngày." },
        vec: { title: "Giấy Miễn Thị Thực", desc: "Có thể gia hạn thêm 180 ngày nếu có người bảo lãnh hợp lệ tại Việt Nam và có lý do chính đáng." }
      },
      note: "Lưu ý: Mọi thủ tục gia hạn tạm trú đều được xử lý tại Cục Quản lý Xuất Nhập cảnh Việt Nam.",
      whyUsFeatures: {
        fast: { title: "Xử Lý Nhanh Chóng", desc: "Nhận kết quả nhanh chóng trong 3-5 ngày làm việc. Chúng tôi hỗ trợ toàn bộ quá trình từ chuẩn bị đến khi hoàn thành." },
        accuracy: { title: "Chính Xác 100%", desc: "Đội ngũ chuyên gia chuẩn bị hồ sơ nhanh chóng và đảm bảo tính chính xác 100% để gia hạn thành công." },
        convenience: { title: "Tiện Lợi", desc: "Không cần đến trực tiếp cơ quan chức năng. Chúng tôi thu hồ sơ và trả kết quả tận nơi tại Việt Nam." }
      },
      contactBtn: "Liên Hệ Gia Hạn Ngay"
    }
  },
  VisaExtensionGuide: {
    whyUsFeatures: {
      noTravel: { title: "Không Cần Đi Lại", desc: "Chúng tôi nhận hồ sơ và trả kết quả tận nơi cho bạn." },
      guaranteed: { title: "Đảm Bảo Kết Quả", desc: "Hơn 10 năm kinh nghiệm làm việc với Cục Xuất Nhập cảnh." },
      noHidden: { title: "Không Phí Ẩn", desc: "Chi phí minh bạch từ đầu, không phát sinh thêm." },
      fast: { title: "Xử Lý Nhanh", desc: "Có dịch vụ xử lý khẩn cấp cho những trường hợp gấp." }
    },
    faqs: {
      q1: { q: "Mất bao lâu để gia hạn visa?", a: "Thời gian xử lý tiêu chuẩn là 5-7 ngày làm việc. Tuy nhiên, chúng tôi cũng cung cấp các tùy chọn xử lý khẩn cấp nếu visa của bạn sắp hết hạn." },
      q2: { q: "Tôi có thể gia hạn E-Visa không?", a: "Không, hiện tại Cục Xuất Nhập cảnh Việt Nam không cho phép gia hạn E-Visa. Bạn phải xuất cảnh và nộp đơn xin visa mới." },
      q3: { q: "Mức phạt khi ở quá hạn là bao nhiêu?", a: "Việc lưu trú quá hạn visa sẽ dẫn đến các khoản phạt hành chính từ 500.000 VNĐ đến 20.000.000 VNĐ tùy thuộc vào số ngày ở quá hạn, đồng thời có nguy cơ bị trục xuất hoặc đưa vào danh sách đen." }
    }
  }
};

const updatesKo = {
  ArticleHero: {
    latestNews: "최신 뉴스",
    guide: "가이드"
  },
  ExtraServicesGuide: {
    fastTrack: {
      noteTitle: "스탬프 수수료는 현금(USD)으로 준비해주세요:",
      note1: "1개월 / 3개월 / 6개월 단수 비자용.",
      note2: "1개월 / 3개월 복수 비자용.",
      note3: "6개월 / 1년 복수 비자용."
    },
    carPickup: {
      table: {
        economicClass: "이코노미 클래스",
        businessClass: "비즈니스 클래스",
        fordTransit: "Ford Transit, Mercedes Transit..",
        huyndai: "Huyndai, Daewoo..",
        civic: "Civic, Chervolet, Altis, Vios..",
        camry: "Camry, Mercedes, BMW, Audi..",
        innova: "Innova, Chervolet..",
        mercedes: "Mercedes, BMW, Audi..",
        contact: "문의하기"
      }
    }
  },
  VisaExemptionsGuide: {
    countries: {
      cl: "칠레", pa: "파나마", kh: "캄보디아", id: "인도네시아", kg: "키르기스스탄",
      la: "라오스", my: "말레이시아", sg: "싱가포르", th: "태국", ph: "필리핀",
      bn: "브루나이", mm: "미얀마", by: "벨라루스", kr: "한국", jp: "일본",
      de: "독일", dk: "덴마크", no: "노르웨이", ru: "러시아", fr: "프랑스",
      fi: "핀란드", es: "스페인", se: "스웨덴", it: "이탈리아", gb: "영국"
    },
    days: "{count} 일",
    otherCases: {
      diplomatic: { title: "외교관 여권", desc: "공무 목적으로 베트남에 입국하는 경우." },
      trc: { title: "임시 거주증", desc: "임시 거주증 기간까지 입국 및 체류 가능." },
      vec: { title: "비자 면제 증명서", desc: "최대 180일까지 입국 및 체류 가능." },
      apec: { title: "APEC 카드", desc: "유효한 여권과 APEC 카드를 소지한 경우 최대 60일까지 입국 및 체류 가능." },
      sez: { title: "경제 특구", desc: "예: 푸꾸옥 섬. 최대 30일까지 입국 및 체류 가능." }
    },
    extension: {
      rules: {
        bilateral: { title: "양자 간 비자 면제", desc: "체류 기간이 만료된 후 베트남에서 출국해야 하며, 더 긴 체류가 필요한 경우 다시 입국해야 합니다." },
        unilateral: { title: "일방적 비자 면제", desc: "허용된 체류 기간이 만료된 후 15일 추가 연장이 가능합니다." },
        vec: { title: "비자 면제 증명서", desc: "베트남 내 유효한 보증인과 정당한 사유가 있는 경우 추가 180일 연장이 가능합니다." }
      },
      note: "참고: 모든 임시 체류 연장은 베트남 출입국 관리국에서 처리됩니다.",
      whyUsFeatures: {
        fast: { title: "빠른 처리", desc: "영업일 기준 3-5일 이내에 결과를 빠르게 받아보세요. 서류 준비부터 완료까지 전 과정을 지원합니다." },
        accuracy: { title: "100% 정확성", desc: "당사의 전문가들이 서류를 신속하게 준비하며 성공적인 연장을 위해 100% 정확성을 보장합니다." },
        convenience: { title: "편의성", desc: "관공서를 방문할 필요가 없습니다. 서류를 수거하고 베트남 내 주소로 결과를 직접 배달해 드립니다." }
      },
      contactBtn: "연장 신청 문의"
    }
  },
  VisaExtensionGuide: {
    whyUsFeatures: {
      noTravel: { title: "방문 불필요", desc: "제출과 수령을 모두 대신 처리해 드립니다." },
      guaranteed: { title: "결과 보장", desc: "출입국 관리국과의 10년 이상의 경험." },
      noHidden: { title: "숨겨진 수수료 없음", desc: "사전 투명한 가격, 추가 비용 없음." },
      fast: { title: "빠른 처리", desc: "촉박한 기한을 위한 긴급 서비스 제공." }
    },
    faqs: {
      q1: { q: "비자 연장에는 얼마나 걸리나요?", a: "표준 처리 시간은 영업일 기준 5-7일입니다. 비자 만료가 임박한 경우 긴급 처리 옵션도 제공합니다." },
      q2: { q: "E-Visa를 연장할 수 있나요?", a: "아니요, 현재 베트남 출입국 관리국은 E-Visa의 연장을 허용하지 않습니다. 베트남에서 출국한 후 새 비자를 신청해야 합니다." },
      q3: { q: "초과 체류 시 페널티는 어떻게 되나요?", a: "비자 기한을 초과하여 체류할 경우 초과 일수에 따라 500,000 VND에서 20,000,000 VND의 행정 벌금이 부과되며, 추방 또는 블랙리스트 등재 가능성도 있습니다." }
    }
  }
};

const mergeDeep = (target, source) => {
  if (typeof target !== 'object' || typeof source !== 'object') return source;
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], mergeDeep(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
};

const updateLocale = (locale, data) => {
const filePath = path.join(__dirname, '..', 'src', 'messages', `${locale}.json`);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const merged = mergeDeep(content, data);
  
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2));
  console.log(`Updated ${locale}.json successfully.`);
};

updateLocale('en', updatesEn);
updateLocale('vi', updatesVi);
updateLocale('ko', updatesKo);
