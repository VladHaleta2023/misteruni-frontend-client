'use client';

import "@/app/styles/table.css";
import "@/app/styles/components.css";
import "@/app/styles/globals.css";
import "@/app/styles/play.css";
import Header from "../components/header";

export default function ExamplePage() {
  return (
    <>
      <Header />
      <main style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "0px", minHeight: "100dvh", height: "100dvh" }}>
        <pre style={{
    whiteSpace: "pre-wrap",
    padding: "20px",
    maxWidth: "900px",
    width: "100%",
    boxSizing: "border-box",
  }}>
{`Chciałbym porozmawiać z tobą w ogóle o nowym zadaniu.
Na podstawie danych firmy Hurtownia ŻABA sp. z o.o., mamy następujące dane:

Salda Początkowe Wybranych Kont
Materiały (310) – 20 000 zł
Towary (330) – 50 000 zł
Rozliczenie niedoborów i szkód (241) – 0 zł
Pozostałe rozrachunki z pracownikami (234) – 0 zł
Kasa (100) – 5 000 zł

Operacje księgowe
1. Zakup materiałów od dostawcy X: 15 000 zł
Wn 310 – Materiały
Ma 210 – Rozrachunki z dostawcami

2. Sprzedaż towarów klientowi Y: 25 000 zł
Wn 200 – Rozrachunki z odbiorcami
Ma 730 – Przychody ze sprzedaży towarów

3. Wydanie materiałów do produkcji: 10 000 zł
Wn 401 – Zużycie materiałów i energii
Ma 310 – Materiały

4. Otrzymanie płatności od klienta Y: 25 000 zł
Wn 131 – Rachunek bieżący
Ma 200 – Rozrachunki z odbiorcami

5. Brak towarów w magazynie: 3 000 zł
Wn 241 – Rozliczenie niedoborów i szkód
Ma 330 – Towary

6. Faktura kosztowa za energię: 5 000 zł
Wn 401 – Zużycie materiałów i energii
Ma 210 – Rozrachunki z dostawcami

7. Zakup towarów od dostawcy Z: 12 000 zł
Wn 330 – Towary
Ma 210 – Rozrachunki z dostawcami

8. Sprzedaż materiałów klientowi W: 8 000 zł
Wn 200 – Rozrachunki z odbiorcami
Ma 740 – Przychody ze sprzedaży materiałów

9. Wypłata wynagrodzeń: 20 000 zł
Wn 404 – Wynagrodzenia
Ma 231 – Rozrachunki z tytułu wynagrodzeń

10. Wydanie towarów klientowi (faktura korygująca): 2 500 zł
Wn 731 – Wartość sprzedanych towarów w cenach zakupu
Ma 330 – Towary

11. Zwiększenie niedoboru zawinionego: 4 000 zł
Wn 241 – Rozliczenie niedoborów i szkód Ma
642 – Rozliczenia międzyokresowe kosztów zakupu

12. Nota – zgoda osoby materialnie odpowiedzialnej: 4 000 zł
Wn 234 – Pozostałe rozrachunki z pracownikami
Ma 241 – Rozliczenie niedoborów i szkód

13. KP – wpłata części należności z tytułu niedoboru: 2 500 zł
Wn 100 – Kasa
Ma 234 – Pozostałe rozrachunki z pracownikami

14. LP – potrącenie w liście płac: 1 500 zł
Wn 231 – Rozrachunki z tytułu wynagrodzeń
Ma 234 – Pozostałe rozrachunki z pracownikami

15. PK – przeksięgowanie zrealizowanych przychodów z tytułu marży niedoboru: 3 000 zł
Wn 642 – Rozliczenia międzyokresowe kosztów zakupu
Ma 761 – Pozostałe koszty operacyjne

Wykonaj analizę błędów dekretacji księgowej wszystkich operacji?`}
        </pre>
      </main>
    </>
  );
}