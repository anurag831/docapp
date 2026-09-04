import React from 'react';

const ROLE_COLORS = {
  owner: '#1a73e8',
  editor: '#34a853',
  commenter: '#e37400',
  viewer: '#7b1fa2',
};

export default function PresenceBar({ collaborators = [], currentUserId, connected }) {
  const otherCollaborators = collaborators.filter(
    (c) => parseInt(c.userId, 10) !== parseInt(currentUserId, 10)
  );

  const typingUsers = otherCollaborators.filter((c) => c.isTyping);

  return (
    <div className="presence-container">
      {/* Active User Avatar Stack */}
      <div className="presence-avatars">
        {collaborators.map((user) => {
          const isSelf = parseInt(user.userId, 10) === parseInt(currentUserId, 10);
          const roleColor = ROLE_COLORS[user.role] || '#5f6368';

          return (
            <div
              key={user.userId}
              className={`presence-avatar-wrap ${isSelf ? 'is-self' : ''}`}
              title={`${user.name} (${user.role})${isSelf ? ' — (You)' : ''}${
                user.isTyping ? ' • Typing...' : ''
              }`}
            >
              <span
                className="presence-avatar"
                style={{ backgroundColor: roleColor }}
              >
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </span>

              {/* Status dot */}
              <span
                className={`presence-status-dot ${
                  user.isTyping ? 'typing' : 'active'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Live typing message */}
      {typingUsers.length > 0 && (
        <div className="presence-typing-indicator">
          <span className="typing-dots">✍️</span>
          <span className="typing-text">
            {typingUsers.map((u) => u.name).join(', ')}{' '}
            {typingUsers.length === 1 ? 'is typing...' : 'are typing...'}
          </span>
        </div>
      )}
    </div>
  );
}
