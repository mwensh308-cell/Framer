# تجميعة الاستريمرز العرب في GTA VI — قناة مستكشف العاب

قالب مونتاج مبني بـ [Remotion](https://www.remotion.dev): مقدمة، بطاقة لكل استريمر، مقاطع بعناوين اللحظات وشريط الاسم، انتقالات، خاتمة بالشكر، وثامبنيل 1280×720.

## التشغيل

```bash
npm install
npm run studio      # معاينة وتعديل في المتصفح
npm run thumbnail   # out/thumbnail.png
npm run render      # out/compilation.mp4 (حوالي 30 دقيقة)
```

## إضافة المقاطع الحقيقية

1. ضع ملفات الفيديو في `public/clips/`.
2. عدّل `src/data.ts`: لكل مقطع `src` و`startFrom` و`duration` و`title`، وأضف حساب كل استريمر في `kick`.
3. ضع صورة وجه كل استريمر في `public/thumb/` واكتب اسمها في `thumb`.

المدة الكلية تُحسب تلقائياً من مجموع المقاطع.
