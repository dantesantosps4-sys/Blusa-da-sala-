import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="student">
      <div className="scard scard--404">
        <div className="scard__badge scard__badge--error">?</div>
        <h1 className="scard__title">Link não encontrado</h1>
        <p className="scard__text">
          Este link não existe ou foi removido. Peça um novo link para quem
          organiza a turma.
        </p>
        <Link to="/admin" className="btn btn--ghost">
          Ir para o painel
        </Link>
      </div>
    </div>
  );
}
