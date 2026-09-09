import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { buildFeedbackReport } from '../feedback/buildFeedbackReport';
import { copyFeedbackReport } from '../feedback/copyFeedbackReport';
import { sendFeedback } from '../feedback/sendFeedback';
import FeedbackModal from './FeedbackModal';

const FeedbackButton = ({ gameState, myUserId, connection, connectionsRef }) => {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const handleOpen = () => {
    const capturedSnapshot = buildFeedbackReport({
      gameState,
      myUserId,
      connection,
      connectionsRef,
    });

    setSnapshot(capturedSnapshot);
    setComment('');
    setStatus(null);
    setIsSending(false);
    setShow(true);
  };

  const handleClose = () => {
    if (isSending) return;
    setShow(false);
  };

  const buildSubmittedReport = () => ({
    ...snapshot,
    comment: comment.trim(),
    submittedAt: new Date().toISOString(),
  });

  const handleCopy = async () => {
    if (!snapshot) return;

    try {
      await copyFeedbackReport(buildSubmittedReport());
      setStatus({
        type: 'success',
        message: t('feedback_copied', { id: snapshot.feedbackId }),
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: t('feedback_copy_error'),
      });
    }
  };

  const handleSend = async () => {
    if (!snapshot || isSending) return;

    setIsSending(true);
    setStatus(null);

    try {
      const result = await sendFeedback(buildSubmittedReport());
      setStatus({
        type: 'success',
        message: t('feedback_sent', {
          id: result.feedbackId || snapshot.feedbackId,
        }),
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: t('feedback_send_error'),
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Button variant="outline-danger" className="mb-2" onClick={handleOpen}>
        {t('feedback_button')}
      </Button>

      <FeedbackModal
        show={show}
        onHide={handleClose}
        comment={comment}
        onCommentChange={setComment}
        onCopy={handleCopy}
        onSend={handleSend}
        feedbackId={snapshot?.feedbackId}
        status={status}
        isSending={isSending}
      />
    </>
  );
};

export default FeedbackButton;
