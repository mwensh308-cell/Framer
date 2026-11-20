// ============================================================
//  بيانات الفيديو — عدّل هذا الملف فقط لتركيب المقاطع الحقيقية
// ============================================================
//
//  لكل مقطع:
//    title     : عنوان اللحظة الذي يظهر على الشاشة
//    src       : اسم ملف الفيديو داخل public/clips (اتركه فارغاً = مقطع مؤقت)
//    startFrom : من أي ثانية في الملف يبدأ المقطع
//    duration  : مدة المقطع بالثواني
//
//  للثامبنيل: ضع صورة وجه كل استريمر في public/thumb باسم thumb.
// ============================================================

export type Clip = {
  title: string;
  src?: string;
  startFrom?: number;
  duration: number;
};

export type Streamer = {
  id: string;
  name: string;
  kick: string; // اسم الحساب على Kick (بدون @)
  color: string;
  thumb?: string; // صورة الوجه للثامبنيل داخل public/thumb
  clips: Clip[];
};

export const channel = {
  name: "مستكشف العاب",
  title: "الاستريمرز العرب يجربون GTA VI",
  subtitle: "أقوى لحظات أول يوم على كيك",
};

const placeholderMoments = (prefix: string): Clip[] => [
  { title: "أول دخول للعبة", duration: 80 },
  { title: "أول جولة في فايس سيتي", duration: 80 },
  { title: "أول مطاردة مع الشرطة", duration: 75 },
  { title: "لحظة ضحك", duration: 70 },
  { title: "أغرب موقف", duration: 70 },
  { title: `رأي ${prefix} في اللعبة`, duration: 70 },
];

export const streamers: Streamer[] = [
  {
    id: "darbha",
    name: "دربحه",
    kick: "",
    color: "#ff2d95",
    clips: placeholderMoments("دربحه"),
  },
  {
    id: "amr",
    name: "Amr",
    kick: "",
    color: "#ffb347",
    clips: placeholderMoments("Amr"),
  },
  {
    id: "turbon",
    name: "تربون",
    kick: "",
    color: "#d61aff",
    clips: placeholderMoments("تربون"),
  },
  {
    id: "ali",
    name: "علي بولتكس",
    kick: "",
    color: "#7b2ff7",
    clips: placeholderMoments("علي"),
  },
];
