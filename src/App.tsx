import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

function Placeholder({ title }: { title: string }) {
  return <h1 className="text-2xl font-bold">{title}</h1>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Placeholder title="Dashboard" />} />
          <Route path="/schedina" element={<Placeholder title="Schedina" />} />
          <Route path="/classifica" element={<Placeholder title="Classifica" />} />
          <Route path="/profilo" element={<Placeholder title="Profilo" />} />
          <Route path="/admin" element={<Placeholder title="Admin" />} />
          <Route path="/admin/risultati" element={<Placeholder title="Risultati" />} />
          <Route path="/admin/giocatori" element={<Placeholder title="Giocatori" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
