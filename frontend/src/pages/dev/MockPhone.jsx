import { useEffect, useRef, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useSession } from '../../context/SessionContext';
import { useNavigate } from 'react-router-dom';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import './mock-phone.css';

/**
 * Mock Phone — dev tool showing realistic WhatsApp/SMS/IVR interface
 * Demonstrates multi-channel follow-up ladder with live escalation.
 */
export default function MockPhone() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [traineeId, setTraineeId] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [clock, setClock] = useState(new Date());
  const messagesEndRef = useRef(null);

  const { data: phoneData, loading: loadingPhone, error: phoneError } = useApi('/dev/phone');
  const { data: clockData } = useApi('/dev/clock');
  const { data: messagesData, reload: reloadMessages } = useApi(
    traineeId ? `/dev/messages/${traineeId}` : null,
    {},
    { interval: 2000 } // auto-refresh every 2s
  );

  // Fallback trainees if API fails
  const fallbackTrainees = [
    { id: 'lakshmi', name: 'Lakshmi Kumar', district: 'Patna', currentStep: 0 },
    { id: 'priya', name: 'Priya Kumari', district: 'Ranchi', currentStep: 5 },
    { id: 'ravi', name: 'Ravi Oraon', district: 'Ranchi', currentStep: 0 },
  ];
  const trainees = phoneData?.trainees || fallbackTrainees;

  useEffect(() => {
    if (clockData) setClock(new Date(clockData.today));
  }, [clockData]);

  useEffect(() => {
    if (messagesData) setMessages(messagesData.messages || []);
  }, [messagesData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedTrainee = trainees?.find((t) => String(t.id) === traineeId);

  const advanceClock = async (days) => {
    const newDate = new Date(clock);
    newDate.setDate(newDate.getDate() + days);
    try {
      const res = await fetch('/api/dev/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate.toISOString() }),
      });
      const data = await res.json();
      setClock(new Date(data.today));
    } catch (err) {
      console.error('Clock update failed:', err);
    }
  };

  const runFollowups = async () => {
    try {
      const res = await fetch('/api/dev/run-followups', { method: 'POST' });
      const data = await res.json();
      console.log('Followups run:', data);
      reloadMessages();
    } catch (err) {
      console.error('Failed to run followups:', err);
    }
  };

  const sendMessage = async () => {
    if (!traineeId || !inputText.trim()) return;

    try {
      const res = await fetch('/api/followups/inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traineeId,
          channel,
          text: inputText,
          phone: selectedTrainee?.contact,
        }),
      });
      if (res.ok) {
        setInputText('');
        setTimeout(reloadMessages, 500);
      }
    } catch (err) {
      console.error('Failed to send:', err);
    }
  };

  if (!session) return <div>Not authenticated</div>;

  const filteredMessages = messages.filter((m) => m.channel === channel);

  return (
    <div className="mock-phone-shell">
      {/* Controls */}
      <div className="phone-controls">
        <div style={{ flex: 1 }}>
          <label>Trainee</label>
          <select
            className="select"
            value={traineeId}
            onChange={(e) => setTraineeId(e.target.value)}
          >
            <option value="">
              {loadingPhone ? 'Loading trainees...' : 'Select trainee...'}
            </option>
            {trainees?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.district} (Step {t.currentStep})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Clock: {clock.toLocaleDateString()}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => advanceClock(1)} size="sm">
              +1 day
            </Button>
            <Button onClick={() => advanceClock(3)} size="sm">
              +3 days
            </Button>
            <Button onClick={runFollowups} size="sm" variant="primary">
              Run Followups
            </Button>
          </div>
        </div>
      </div>

      {traineeId && selectedTrainee && (
        <div className="phone-container">
          {/* Phone frame */}
          <div className="phone-frame">
            <div className="phone-header">
              <div className="phone-status">
                <span>9:41</span>
              </div>
              <div className="phone-title">LifeTrack</div>
            </div>

            {/* Channel tabs */}
            <div className="phone-tabs">
              {['whatsapp', 'sms', 'ivr'].map((ch) => (
                <button
                  key={ch}
                  className={`tab ${channel === ch ? 'active' : ''}`}
                  onClick={() => setChannel(ch)}
                >
                  {ch.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="phone-messages">
              {filteredMessages.length === 0 ? (
                <div className="empty-chat">No messages yet on {channel}</div>
              ) : (
                filteredMessages.map((msg, i) => (
                  <div key={i} className={`message ${msg.direction}`}>
                    <div className="msg-bubble">
                      {msg.body}
                      {msg.digits && <div className="msg-digits">Digits: {msg.digits}</div>}
                    </div>
                    <div className="msg-time">
                      {new Date(msg.sentAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="phone-input">
              <input
                type="text"
                placeholder="Reply..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage} className="send-btn">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
