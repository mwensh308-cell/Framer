# تاريخنا — Tarikhna

موقع عربي ثابت يوثّق تاريخ الدوري المصري وكرة القدم المصرية: الحقب التاريخية، وملفات الأندية، وسير اللاعبين واللاعبات، والهدافون، وأرشيف الألقاب، والأخبار، والمصادر.

- **خطة العمل الكاملة:** [PLAN.md](PLAN.md)
- **موجز التصميم ثلاثي الأبعاد والحركة:** [DESIGN_BRIEF.md](DESIGN_BRIEF.md)
- **الشعارات الرسمية:** [assets/logos/README.md](assets/logos/README.md)
- **البيانات:** `data/*.json` (المصدر الوحيد للمحتوى)
- **المولّد:** `tools/build.py` (بايثون 3، بلا اعتماديات)
- **الموقع الناتج:** `public/`

```bash
cd tarikhna && python3 tools/build.py
```

```bash
cd tarikhna/public && python3 -m http.server 8000
```

ثم افتح http://localhost:8000
