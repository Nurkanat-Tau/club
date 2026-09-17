import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { waLink } from "@/lib/phone";

export const dynamic = "force-dynamic";
export const metadata = { title: "Данные и правила" };

export default function Privacy() {
  const contact = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP;
  return (
    <>
      <Header back={{ href: "/shymkent", label: "Назад" }} />
      <main className="space-y-4 px-4 pb-12 pt-6 leading-relaxed">
        <h1 className="text-2xl font-bold">Данные и правила</h1>
        <h2 className="pt-2 text-lg font-semibold">Какие данные мы храним</h2>
        <p>Имя, номер телефона (WhatsApp), клубы, в которые вы вступили, встречи, на которые записались, отметки о посещении и ваши оценки встреч.</p>
        <h2 className="pt-2 text-lg font-semibold">Зачем</h2>
        <p>Чтобы организатор клуба мог напомнить о встрече и связаться с вами, а вы — войти со своего номера на любом устройстве. Обезличенная статистика помогает понять, какие встречи людям нравятся.</p>
        <h2 className="pt-2 text-lg font-semibold">Кто видит</h2>
        <p>Номер телефона видит только организатор клуба, в который вы вступили или на встречу которого записались, и администратор Club. Другие участники видят только ваше имя в списке идущих. Оценку и комментарий к встрече видит организатор.</p>
        <p><b>Мы не продаём</b> и не передаём ваши данные для рекламы.</p>
        <h2 id="delete" className="pt-2 text-lg font-semibold">Как удалить данные</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Выйти из клуба — на странице клуба или в «Мои встречи».</li>
          <li>Удалить профиль целиком — «Мои встречи» → «Удалить мой профиль». Данные удаляются сразу.</li>
          <li>Остались вопросы — напишите администратору{contact ? "" : " через организатора вашего клуба"}.</li>
        </ul>
        {contact && (
          <a className="btn-primary btn-sm" href={waLink(contact, "Здравствуйте! Вопрос о моих данных в Club.")} target="_blank" rel="noopener noreferrer">
            Написать администратору
          </a>
        )}
        <h2 className="pt-2 text-lg font-semibold">Правила для организаторов</h2>
        <p>Используйте номера участников только для связи по делам клуба. Не публикуйте ложную информацию о встречах. Администратор может скрыть или удалить клуб, нарушающий правила.</p>
        <p className="text-sm text-muted">Обработка ведётся в соответствии с Законом РК «О персональных данных и их защите». Текст будет уточнён юристом перед широким запуском.</p>
      </main>
      <Footer />
    </>
  );
}
