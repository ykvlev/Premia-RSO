#!/bin/bash
ENV=/var/www/premia/.env
read -s -p "Вставь пароль приложения mail.ru и нажми Enter: " P; echo
if [ -z "$P" ]; then echo "Пусто — отмена."; exit 1; fi
sed -i '/^SMTP_PASSWORD=/d' "$ENV"
echo "SMTP_PASSWORD=\"$P\"" >> "$ENV"
set -a; . "$ENV"; set +a
systemctl restart premia
cd /var/www/premia
node -e 'const nm=require("nodemailer");const t=nm.createTransport({host:"smtp.mail.ru",port:2525,secure:false,requireTLS:true,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}});t.sendMail({from:process.env.SMTP_FROM,to:process.env.SMTP_USER,subject:"Тест SMTP — Труд крут",text:"Если вы это читаете — почта сайта работает."}).then(()=>console.log("\nOK: тестовое письмо отправлено на "+process.env.SMTP_USER+" — проверь входящие (и папку Спам)")).catch(e=>console.error("\nОШИБКА отправки:",e.message))'
