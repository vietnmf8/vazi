const fs = require('fs');
const path = require('path');

const locales = ['en', 'vi', 'ko'];

const updatesEn = {
  PaymentGuideline: {
    heroTitle: "Payment Guideline",
    heroSubtitle: "We offer secure and convenient payment options for your visa application. Remember that the fee you pay us is the service fee to process your visa approval letter.",
    toc: {
      paymentOptions: "How to Make Payment",
      specialNotes: "Special Notes",
      needHelp: "Need Help?"
    },
    options: {
      title: "How To Make Payment?",
      desc: "There are 2 convenient options to make payment for your visa application. Choose the one that works best for you.",
      opt1: "Option 1",
      paypal: {
        title: "Pay via PayPal",
        desc1: "Pay through <strong>PayPal (www.paypal.com)</strong> using your credit card.",
        desc2: "On the last step of the application process, we will provide a payment link via the PayPal gate, or the link will be sent to your email. Click that payment link to make a payment using our PayPal Address:",
        quote: "\"The www.paypal.com is one among the most reliable International Money-Transfer Networks. It is used to send and receive money by customers worldwide. Safer, Easier, Quicker, and no refunded online money sending is what customers find at PayPal.\" – Paypal"
      },
      opt2: "Option 2",
      cash: {
        title: "Pay in Cash",
        desc1: "Pay in cash at our office in Vietnam.",
        desc2: "If you have friends or relatives in Vietnam, you can ask them to visit our office to make the payment for your application.",
        officeTitle: "Our Office Address",
        officeDesc1: "VietnamEvisa.com Office:",
        officeDesc2: "No 47/2 Hoang Sam, Nghia Do Ward, Cau Giay Dist, Hanoi City, Vietnam"
      }
    },
    notes: {
      title: "Special Notes",
      imgAlt: "Special Notes",
      imgDesc: "Important information regarding your visa application processing.",
      processTitle: "Processing Time",
      processDesc: "Once we receive your payment, we will process your visa approval letter. It will be ready on our website after <strong>1 business day</strong> (urgent service) or <strong>2 business days</strong> (normal service).",
      feeTitle: "Service Fee vs. Stamping Fee",
      feeDesc: "The fee you pay us is the <strong>service fee</strong> used to process your visa approval letter. When picking up the visa stamp at the arrival airport, you are required to pay an additional <strong>stamping fee</strong>.",
      viewFee: "View detailed Vietnam visa fees"
    },
    help: {
      title: "Need Help?",
      desc: "Our support department is ready to assist you. We will respond within 2 hours during business hours and within 24 hours out of office hours.",
      hotline: "Hotline (WhatsApp)",
      email: "Email Address"
    }
  }
};

const updatesVi = {
  PaymentGuideline: {
    heroTitle: "Hướng Dẫn Thanh Toán",
    heroSubtitle: "Chúng tôi cung cấp các tùy chọn thanh toán an toàn và thuận tiện cho hồ sơ xin visa của bạn. Xin lưu ý rằng khoản phí bạn trả cho chúng tôi là phí dịch vụ để xử lý công văn chấp thuận visa.",
    toc: {
      paymentOptions: "Cách thanh toán",
      specialNotes: "Lưu ý đặc biệt",
      needHelp: "Bạn cần hỗ trợ?"
    },
    options: {
      title: "Làm thế nào để thanh toán?",
      desc: "Có 2 lựa chọn tiện lợi để thanh toán cho hồ sơ xin visa của bạn. Hãy chọn phương thức phù hợp nhất.",
      opt1: "Lựa chọn 1",
      paypal: {
        title: "Thanh toán qua PayPal",
        desc1: "Thanh toán qua <strong>PayPal (www.paypal.com)</strong> bằng thẻ tín dụng của bạn.",
        desc2: "Ở bước cuối cùng của quá trình nộp đơn, chúng tôi sẽ cung cấp liên kết thanh toán qua cổng PayPal, hoặc liên kết sẽ được gửi đến email của bạn. Nhấp vào liên kết đó để thanh toán qua địa chỉ PayPal của chúng tôi:",
        quote: "\"www.paypal.com là một trong những mạng chuyển tiền quốc tế đáng tin cậy nhất. Nó được sử dụng để gửi và nhận tiền bởi khách hàng trên toàn thế giới. An toàn hơn, dễ dàng hơn, nhanh hơn và không hoàn lại tiền trực tuyến là những gì khách hàng tìm thấy tại PayPal.\" – Paypal"
      },
      opt2: "Lựa chọn 2",
      cash: {
        title: "Thanh toán bằng tiền mặt",
        desc1: "Thanh toán bằng tiền mặt tại văn phòng của chúng tôi ở Việt Nam.",
        desc2: "Nếu bạn có bạn bè hoặc người thân ở Việt Nam, bạn có thể nhờ họ đến văn phòng của chúng tôi để thanh toán cho hồ sơ của bạn.",
        officeTitle: "Địa chỉ văn phòng",
        officeDesc1: "Văn phòng VietnamEvisa.com:",
        officeDesc2: "Số 47/2 Hoàng Sâm, Nghĩa Đô, Cầu Giấy, Hà Nội, Việt Nam"
      }
    },
    notes: {
      title: "Lưu ý đặc biệt",
      imgAlt: "Lưu ý đặc biệt",
      imgDesc: "Thông tin quan trọng về quá trình xử lý hồ sơ xin visa của bạn.",
      processTitle: "Thời gian xử lý",
      processDesc: "Sau khi nhận được thanh toán, chúng tôi sẽ xử lý công văn chấp thuận visa của bạn. Nó sẽ sẵn sàng trên trang web của chúng tôi sau <strong>1 ngày làm việc</strong> (dịch vụ khẩn cấp) hoặc <strong>2 ngày làm việc</strong> (dịch vụ bình thường).",
      feeTitle: "Phí dịch vụ và Phí dán tem",
      feeDesc: "Phí bạn trả cho chúng tôi là <strong>phí dịch vụ</strong> dùng để xử lý công văn chấp thuận visa. Khi nhận tem visa tại sân bay đến, bạn bắt buộc phải trả thêm <strong>phí dán tem</strong>.",
      viewFee: "Xem chi tiết phí visa Việt Nam"
    },
    help: {
      title: "Bạn cần hỗ trợ?",
      desc: "Bộ phận hỗ trợ của chúng tôi sẵn sàng giúp đỡ bạn. Chúng tôi sẽ phản hồi trong vòng 2 giờ trong giờ làm việc và trong vòng 24 giờ ngoài giờ làm việc.",
      hotline: "Hotline (WhatsApp)",
      email: "Địa chỉ Email"
    }
  }
};

const updatesKo = {
  PaymentGuideline: {
    heroTitle: "결제 방법",
    heroSubtitle: "비자 신청을 위해 안전하고 편리한 결제 옵션을 제공합니다. 저희에게 지불하시는 수수료는 비자 승인서를 처리하기 위한 서비스 수수료임을 기억해 주세요.",
    toc: {
      paymentOptions: "결제 방법",
      specialNotes: "특별 참고 사항",
      needHelp: "도움이 필요하신가요?"
    },
    options: {
      title: "결제는 어떻게 하나요?",
      desc: "비자 신청을 위해 두 가지 편리한 결제 옵션이 있습니다. 가장 적합한 옵션을 선택하세요.",
      opt1: "옵션 1",
      paypal: {
        title: "PayPal 결제",
        desc1: "신용카드를 사용하여 <strong>PayPal (www.paypal.com)</strong>을 통해 결제하세요.",
        desc2: "신청 절차의 마지막 단계에서 PayPal 게이트웨이를 통한 결제 링크를 제공하거나 이메일로 링크를 보내드립니다. 해당 결제 링크를 클릭하여 당사의 PayPal 주소로 결제하세요:",
        quote: "\"www.paypal.com은 가장 신뢰할 수 있는 국제 송금 네트워크 중 하나입니다. 전 세계 고객이 돈을 보내고 받는 데 사용됩니다. 더 안전하고 쉽고 빠르며 온라인 송금 환불이 없는 것이 고객이 PayPal에서 찾는 것입니다.\" – Paypal"
      },
      opt2: "옵션 2",
      cash: {
        title: "현금 결제",
        desc1: "베트남에 있는 당사 사무실에서 현금으로 결제하세요.",
        desc2: "베트남에 친구나 친척이 있는 경우, 그들에게 당사 사무실을 방문하여 신청서 결제를 도와달라고 요청할 수 있습니다.",
        officeTitle: "사무실 주소",
        officeDesc1: "VietnamEvisa.com 사무실:",
        officeDesc2: "No 47/2 Hoang Sam, Nghia 도, Cau Giay Dist, Hanoi City, Vietnam"
      }
    },
    notes: {
      title: "특별 참고 사항",
      imgAlt: "특별 참고 사항",
      imgDesc: "비자 신청 처리와 관련된 중요 정보입니다.",
      processTitle: "처리 시간",
      processDesc: "결제가 확인되면 비자 승인서를 처리합니다. <strong>영업일 1일</strong>(급행 서비스) 또는 <strong>영업일 2일</strong>(일반 서비스) 후에 웹사이트에서 준비됩니다.",
      feeTitle: "서비스 수수료 vs 스탬프 수수료",
      feeDesc: "저희에게 지불하는 수수료는 비자 승인서를 처리하는 데 사용되는 <strong>서비스 수수료</strong>입니다. 도착 공항에서 비자 스탬프를 받을 때 추가로 <strong>스탬프 수수료</strong>를 지불해야 합니다.",
      viewFee: "베트남 비자 수수료 자세히 보기"
    },
    help: {
      title: "도움이 필요하신가요?",
      desc: "고객 지원팀이 도와드릴 준비가 되어 있습니다. 업무 시간 중에는 2시간 이내에, 업무 시간 외에는 24시간 이내에 답변해 드립니다.",
      hotline: "핫라인 (WhatsApp)",
      email: "이메일 주소"
    }
  }
};

const mergeDeep = (target, source) => {
  if (typeof target !== 'object' || target === null) return source;
  if (typeof source !== 'object' || source === null) return source;

  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && !Array.isArray(source[key]) && target[key]) {
      output[key] = mergeDeep(target[key], source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
};

const updateLocale = (locale, data) => {
  const filePath = path.join(__dirname, '..', 'src', 'messages', `${locale}.json`);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const merged = mergeDeep(content, data);
  
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n');
  console.log(`Updated ${locale}.json successfully.`);
};

updateLocale('en', updatesEn);
updateLocale('vi', updatesVi);
updateLocale('ko', updatesKo);
