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
  subtitle: "أقوى لحظات أول تجربة على كيك",
};

// المقاطع مأخوذة من كليبات بث GTA VI على Kick (18–19 نوفمبر 2026)
export const streamers: Streamer[] = [
  {
    id: "drb7h",
    name: "دربحه",
    kick: "drb7h",
    color: "#ff2d95",
    thumb: "drb7h.png",
    clips: [
      { title: "البداية: لوسيا في السجن", src: "drb7h_0.mp4", duration: 89 },
      { title: "سرقة المحل والهروب", src: "drb7h_1.mp4", duration: 89 },
      { title: "رحلة بالقارب مع الشباب", src: "drb7h_2.mp4", duration: 89 },
      { title: "مطاردة في المستنقعات… Wasted!", src: "drb7h_3.mp4", duration: 89 },
      { title: "دربحه يعطي رأيه في اللعبة", src: "drb7h_4.mp4", duration: 89 },
    ],
  },
  {
    id: "shaf3ey97",
    name: "شافعي",
    kick: "shaf3ey97",
    color: "#ffb347",
    thumb: "shaf3ey97.png",
    clips: [
      { title: "جولة بالقارب في فايس سيتي", src: "shaf3ey97_0.mp4", duration: 84 },
      { title: "مطاردة في الغابة… Wasted!", src: "shaf3ey97_1.mp4", duration: 84 },
      { title: "اقتحام البيت", src: "shaf3ey97_2.mp4", duration: 73.5 },
      { title: "داخل البيت", src: "shaf3ey97_3.mp4", duration: 30 },
      { title: "ضحكة شافعي 😂", src: "shaf3ey97_4.mp4", duration: 33 },
      { title: "مهمة في الظلام", src: "shaf3ey97_5.mp4", duration: 82 },
      { title: "أول رسائل على الجوال", src: "shaf3ey97_6.mp4", duration: 58 },
    ],
  },
  {
    id: "tarboun",
    name: "تربون",
    kick: "tarboun",
    color: "#d61aff",
    thumb: "tarboun.png",
    clips: [
      { title: "أول ردة فعل لتربون", src: "tarboun_0.mp4", duration: 30 },
      { title: "تربون مصدوم!", src: "tarboun_1.mp4", duration: 54 },
      { title: "أول جولة في الشوارع", src: "tarboun_2.mp4", duration: 72 },
      { title: "مهمة داخل البيت", src: "tarboun_3.mp4", duration: 72 },
      { title: "زيارة المحل", src: "tarboun_4.mp4", duration: 72 },
      { title: "مواجهة في المطعم", src: "tarboun_5.mp4", duration: 72 },
      { title: "رحلة بالطائرة المائية", src: "tarboun_6.mp4", duration: 72 },
    ],
  },
  {
    id: "3li_boltx",
    name: "علي بولتكس",
    kick: "3li_boltx",
    color: "#7b2ff7",
    thumb: "3li_boltx.png",
    clips: [
      { title: "القائد يبدأ التجربة", src: "3li_boltx_0.mp4", duration: 70 },
      { title: "فوضى في الاستريم 😂", src: "3li_boltx_1.mp4", duration: 70 },
      { title: "أول جولة مع جيسون", src: "3li_boltx_2.mp4", duration: 70 },
      { title: "لحظة هدوء في البيت", src: "3li_boltx_3.mp4", duration: 70 },
      { title: "جولة في الحي", src: "3li_boltx_4.mp4", duration: 38 },
      { title: "ردة فعل الشلة", src: "3li_boltx_5.mp4", duration: 70 },
      { title: "نهاية الليلة", src: "3li_boltx_6.mp4", duration: 56 },
    ],
  },
];
