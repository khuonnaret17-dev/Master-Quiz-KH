import { Ministry } from './types';

export const ministries: Ministry[] = [
  {
    id: "moeys",
    name: "Ministry of Education, Youth and Sport",
    khmerName: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    description: "Responsible for education, youth development and sports activities in Cambodia.",
    details: "The Ministry of Education, Youth and Sport (MoEYS) is responsible for promoting and managing the education system in Cambodia. This includes primary, secondary, and higher education, as well as vocational training and the development of youth and sports programs across the country. Its mission is to ensure that all Cambodian citizens have access to quality education and opportunities for physical and intellectual growth.",
    logo: "https://picsum.photos/seed/education/200/200",
    color: "blue",
    quizzes: [
      {
        id: "moeys-q1",
        type: "MULTIPLE_CHOICE",
        category: "ចំណេះដឹងទូទៅ",
        question: "តើក្រសួងអប់រំ យុវជន និងកីឡា បង្កើតឡើងក្នុងឆ្នាំណា?",
        options: { "A": "១៩៩៣", "B": "១១៩៩៥", "C": "១៩៩៦", "D": "១៩៩៧" },
        correctAnswer: "A",
        explanation: "ក្រសួងអប់រំ យុវជន និងកីឡា ត្រូវបានបង្កើតឡើងវិញក្នុងឆ្នាំ១៩៩៣។"
      },
      {
        id: "moeys-q2",
        type: "Q_AND_A",
        category: "ច្បាប់ និងបទបញ្ជា",
        question: "តើអ្វីទៅជាបេសកកម្មរបស់ក្រសួងអប់រំ?",
        answer: "បេសកកម្មគឺការដឹកនាំ ការគ្រប់គ្រង និងការអភិវឌ្ឍវិស័យអប់រំ យុវជន និងកីឡា។"
      },
      {
        id: "moeys-t1",
        type: "VOCABULARY",
        category: "ពន្យល់ពាក្យបច្ចេកទេស",
        question: "MoEYS",
        answer: "Ministry of Education, Youth and Sport (ក្រសួងអប់រំ យុវជន និងកីឡា)"
      },
      {
        id: "moeys-t2",
        type: "VOCABULARY",
        category: "ពន្យល់ពាក្យបច្ចេកទេស",
        question: "គ្រឹះស្ថានសិក្សា",
        answer: "Educational institution"
      }
    ]
  },
  {
    id: "moh",
    name: "Ministry of Health",
    khmerName: "ក្រសួងសុខាភិបាល",
    description: "Governs public health, hospitals, and healthcare services.",
    details: "The Ministry of Health (MoH) works to improve the health and well-being of the Cambodian people through a comprehensive and sustainable healthcare system. It manages public health initiatives, infectious disease control, maternal and child health, and the regulation of private and public medical institutions and pharmaceuticals.",
    logo: "https://picsum.photos/seed/health/200/200",
    color: "red",
    quizzes: [
      {
        id: "moh-q1",
        type: "MULTIPLE_CHOICE",
        category: "ចំណេះដឹងវេជ្ជសាស្ត្រមូលដ្ឋាន",
        question: "តើលេខទូរស័ព្ទសង្គ្រោះបន្ទាន់របស់ក្រសួងសុខាភិបាលគឺលេខប៉ុន្មាន?",
        options: { "A": "១១៧", "B": "១១៨", "C": "១១៩", "D": "១១៥" },
        correctAnswer: "D",
        explanation: "លេខ ១១៥ គឺជាលេខទូរស័ព្ទសម្រាប់រាយការណ៍ជំងឺឆ្លង និងសាកសួរព័ត៌មានសុខភាព។"
      },
      {
        id: "moh-t1",
        type: "VOCABULARY",
        category: "ពន្យល់ពាក្យបច្ចេកទេស",
        question: "សុខភាពមាតា និងទារក",
        answer: "Maternal and Child Health"
      }
    ]
  },
  {
    id: "mef",
    name: "Ministry of Economy and Finance",
    khmerName: "ក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ",
    description: "Manages the national economy, budget, and financial policies.",
    details: "The Ministry of Economy and Finance (MEF) is the lead government agency for managing national finances, economic policy, and revenue collection. It coordinates the national budget, oversees public investment, and works to maintain economic stability and promote growth in Cambodia.",
    logo: "https://picsum.photos/seed/finance/200/200",
    color: "emerald",
    quizzes: [
      {
        id: "mef-q1",
        type: "Q_AND_A",
        category: "ហិរញ្ញវត្ថុសាធារណៈ",
        question: "តើអ្វីទៅជាតួនាទីចម្បងរបស់ក្រសួងសេដ្ឋកិច្ច?",
        answer: "ដឹកនាំ និងគ្រប់គ្រងបេសកកម្មលើវិស័យសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុនៃព្រះរាជាណាចក្រកម្ពុជា។"
      },
      {
        id: "mef-t1",
        type: "VOCABULARY",
        category: "ពន្យល់ពាក្យបច្ចេកទេស",
        question: "GDP",
        answer: "Gross Domestic Product (ផលិតផលក្នុងស្រុកសរុប)"
      }
    ]
  },
  {
    id: "moi",
    name: "Ministry of Interior",
    khmerName: "ក្រសួងមហាផ្ទៃ",
    description: "Handles internal security, local administration, and police.",
    details: "The Ministry of Interior (MoI) is responsible for a wide range of administrative and security functions, including civil registration, local governance at the provincial and district levels, and the management of the National Police. It plays a key role in maintaining social order and public safety.",
    logo: "https://picsum.photos/seed/interior/200/200",
    color: "slate"
  },
  {
    id: "mot",
    name: "Ministry of Tourism",
    khmerName: "ក្រសួងទេសចរណ៍",
    description: "Promotes and develops the tourism industry in Cambodia.",
    details: "The Ministry of Tourism (MoT) focuses on promoting Cambodia as a world-class tourism destination. It develops tourism policies, manages cultural and natural heritage sites for visitors, and works to enhance the quality of tourism services to drive sustainable economic development.",
    logo: "https://picsum.photos/seed/tourism/200/200",
    color: "amber"
  },
  {
    id: "maff",
    name: "Ministry of Agriculture, Forestry and Fisheries",
    khmerName: "ក្រសួងកសិកម្ម រុក្ខាប្រមាញ់ និងនេសាទ",
    description: "Responsible for agriculture, forestry, and fisheries management.",
    logo: "https://picsum.photos/seed/agriculture/200/200",
    color: "green"
  },
  {
    id: "mfaic",
    name: "Ministry of Foreign Affairs and International Cooperation",
    khmerName: "ក្រសួងការបរទេស និងសហប្រតិបត្តិការអន្តរជាតិ",
    description: "Manages foreign relations and international cooperation.",
    logo: "https://picsum.photos/seed/foreign/200/200",
    color: "indigo"
  },
  {
    id: "mptc",
    name: "Ministry of Post and Telecommunications",
    khmerName: "ក្រសួងប្រៃសណីយ៍ និងទូរគមនាគមន៍",
    description: "Regulates telecommunications and postal services.",
    logo: "https://picsum.photos/seed/telecom/200/200",
    color: "cyan"
  }
];
