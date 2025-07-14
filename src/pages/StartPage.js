import React from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/main.scss';
import Menu from '../components/Menu';
import { useTranslation } from 'react-i18next';

const StartPage = () => {
  const { t, i18n } = useTranslation();
  return (
    <div className="container-fluid">
      <div className="row min-vh-100">
        {/* Main content */}
        <div className="col-12 col-lg-9 d-flex flex-column justify-content-center align-items-center text-center">
          <h1 className="mb-4">{t('welcome')}</h1>

          <div className="mb-3">
            <Link to="/create" className="btn btn-primary btn-lg">
              {t('create_game')}
            </Link>
          </div>
          <div>
            <Link to="/JoinGamePage" className="btn btn-success btn-lg">
              {t('join_game')}
            </Link>
          </div>
        </div>

        {/* Sidebar menu */}
        <div className="d-none d-lg-block col-lg-3 border-start position-fixed end-0 top-0 h-100">
          <Menu />
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="d-block d-lg-none w-100 position-fixed bottom-0 start-0 bg-light border-top">
        <div className="container-fluid">
          <Menu />
        </div>
      </div>
    </div>
  );
};

export default StartPage;
