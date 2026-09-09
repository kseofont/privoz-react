import React from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const FeedbackModal = ({
  show,
  onHide,
  comment,
  onCommentChange,
  onCopy,
  onSend,
  feedbackId,
  status,
  isSending,
}) => {
  const { t } = useTranslation();

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton={!isSending}>
        <Modal.Title>{t('feedback_title')}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <label htmlFor="privoz-feedback-comment" className="form-label fw-semibold">
          {t('feedback_question')}
        </label>
        <textarea
          id="privoz-feedback-comment"
          className="form-control"
          rows={5}
          maxLength={2000}
          value={comment}
          disabled={isSending}
          onChange={event => onCommentChange(event.target.value)}
          placeholder={t('feedback_placeholder')}
        />

        <p className="mt-3 mb-2">{t('feedback_technical_intro')}</p>
        <ul className="mb-3">
          <li>{t('feedback_detail_turn')}</li>
          <li>{t('feedback_detail_game')}</li>
          <li>{t('feedback_detail_events')}</li>
          <li>{t('feedback_detail_network')}</li>
          <li>{t('feedback_detail_version')}</li>
        </ul>

        {feedbackId && (
          <div className="small text-muted mb-3">
            {t('feedback_report_id', { id: feedbackId })}
          </div>
        )}

        {status?.message && (
          <Alert variant={status.type === 'success' ? 'success' : 'danger'} className="mb-0">
            {status.message}
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isSending}>
          {t('feedback_close')}
        </Button>
        <Button variant="outline-primary" onClick={onCopy} disabled={isSending}>
          {t('feedback_copy')}
        </Button>
        <Button variant="primary" onClick={onSend} disabled={isSending}>
          {isSending ? t('feedback_sending') : t('feedback_send')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FeedbackModal;
