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
      <div className="row flex-column flex-sm-row">
        {/* Main content */}
        <div className="col-12 col-sm-9 order-2 order-sm-1 d-flex flex-column justify-content-center align-items-center text-center">
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
        <div className="col-12 col-sm-3 order-1 order-sm-2 border-start">
          <Menu />
        </div>
      </div>
    </div>
  );
};

export default StartPage;
