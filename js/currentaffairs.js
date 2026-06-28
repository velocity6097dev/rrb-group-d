const CurrentAffairs = (() => {
  const CACHE_KEY = 'currentAffairsData';
  const REFRESH_INTERVAL = 5 * 60 * 60 * 1000;
  let refreshTimeout;

  const elements = {
    container: null,
    refreshBtn: null,
    lastSyncTime: null,
  };

  const state = {
    isLoading: false,
    data: null,
  };

  // Find elements with multiple selector attempts
  const findElements = () => {
    // Try different possible IDs
    const containerIds = ['current-affairs-container', 'affairs-container', 'current-affairs', 'currentAffairs'];
    const buttonIds = ['refresh-current-affairs-btn', 'refresh-affairs-btn', 'refreshBtn', 'refreshAffairs'];
    const syncIds = ['last-sync-time', 'lastSyncTime', 'syncTime'];

    for (let id of containerIds) {
      elements.container = document.getElementById(id);
      if (elements.container) {
        console.log('Found container:', id);
        break;
      }
    }

    for (let id of buttonIds) {
      elements.refreshBtn = document.getElementById(id);
      if (elements.refreshBtn) {
        console.log('Found button:', id);
        break;
      }
    }

    for (let id of syncIds) {
      elements.lastSyncTime = document.getElementById(id);
      if (elements.lastSyncTime) {
        console.log('Found sync time:', id);
        break;
      }
    }

    return elements.container && elements.refreshBtn;
  };

  const init = () => {
    if (!findElements()) {
      console.error('Current Affairs: Required DOM elements not found');
      console.error('Looking for container:', ['current-affairs-container', 'affairs-container', 'current-affairs', 'currentAffairs']);
      console.error('Looking for button:', ['refresh-current-affairs-btn', 'refresh-affairs-btn', 'refreshBtn', 'refreshAffairs']);
      return false;
    }

    loadCachedData();
    if (elements.refreshBtn) {
      elements.refreshBtn.addEventListener('click', handleRefresh);
    }
    scheduleAutoRefresh();
    render();
    return true;
  };

  const handleRefresh = async (e) => {
    if (state.isLoading) return;
    
    e.preventDefault();
    
    state.isLoading = true;
    if (elements.refreshBtn) {
      elements.refreshBtn.disabled = true;
      const originalHTML = elements.refreshBtn.innerHTML;
      elements.refreshBtn.innerHTML = `<span class="spinner"></span> Refreshing...`;
      
      try {
        const response = await fetch('/data/current_affairs.json?t=' + Date.now());
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const newData = await response.json();
        localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
        state.data = newData;

        showNotification('✅ Current affairs updated successfully!', 'success');
        render();
        
        clearTimeout(refreshTimeout);
        scheduleAutoRefresh();

      } catch (error) {
        console.error('Error refreshing current affairs:', error);
        showNotification('❌ Failed to refresh. Using cached data.', 'error');
      } finally {
        state.isLoading = false;
        elements.refreshBtn.disabled = false;
        elements.refreshBtn.innerHTML = originalHTML;
      }
    }
  };

  const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.className = `ca-notification ca-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 14px 20px;
      border-radius: 6px;
      background: ${type === 'success' ? '#4caf50' : '#f44336'};
      color: white;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: caSlideIn 0.3s ease-out;
    `;

    if (!document.querySelector('style[data-ca-animations]')) {
      const style = document.createElement('style');
      style.setAttribute('data-ca-animations', 'true');
      style.textContent = `
        @keyframes caSlideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes caSlideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(400px); opacity: 0; }
        }
        @keyframes caSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: caSpin 0.8s linear infinite;
          margin-right: 6px;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'caSlideOut 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  };

  const loadCachedData = () => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        state.data = JSON.parse(cached);
      } catch (e) {
        console.warn('Failed to parse cached current affairs data');
        state.data = null;
      }
    }
  };

  const scheduleAutoRefresh = () => {
    clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(() => {
      console.log('Auto-refreshing current affairs...');
      if (elements.refreshBtn) {
        handleRefresh({ preventDefault: () => {} });
      }
    }, REFRESH_INTERVAL);
  };

  const updateLastSyncTime = () => {
    if (!elements.lastSyncTime || !state.data) return;

    const lastUpdated = new Date(state.data.lastUpdated);
    const now = new Date();
    const diffMs = now - lastUpdated;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let timeText;
    if (diffMins < 1) {
      timeText = 'Just now';
    } else if (diffMins < 60) {
      timeText = `${diffMins}m ago`;
    } else if (diffHours < 24) {
      timeText = `${diffHours}h ago`;
    } else {
      timeText = `${diffDays}d ago`;
    }

    elements.lastSyncTime.textContent = `Last synced: ${timeText}`;
    elements.lastSyncTime.style.cssText = 'font-size: 12px; color: #999; margin-left: 20px; white-space: nowrap;';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
  };

  const render = () => {
    if (!elements.container) {
      console.warn('Container element not found for rendering');
      return;
    }

    elements.container.innerHTML = '';
    updateLastSyncTime();

    if (!state.data || !state.data.items || state.data.items.length === 0) {
      elements.container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #666; background: #f5f5f5; border-radius: 8px;">
          <p style="margin: 8px 0; font-size: 16px;">📚 No current affairs data available yet.</p>
          <p style="margin: 8px 0; font-size: 14px;">Click "Refresh Now" to fetch the latest updates.</p>
        </div>
      `;
      return;
    }

    const byCategory = {};
    state.data.items.forEach(item => {
      if (!byCategory[item.category]) {
        byCategory[item.category] = [];
      }
      byCategory[item.category].push(item);
    });

    Object.entries(byCategory).forEach(([category, items], index) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.style.cssText = `
        margin-bottom: 24px;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      `;

      const categoryTitle = document.createElement('h3');
      categoryTitle.style.cssText = `
        padding: 14px 16px;
        margin: 0;
        border-bottom: 2px solid #e0e0e0;
        font-size: 16px;
        font-weight: 600;
        color: #333;
        background: #f9f9f9;
      `;
      
      const colors = ['#667eea', '#f5576c', '#00f2fe', '#38f9d7', '#fee140', '#330867', '#fed6e3', '#ff6a88'];
      const badgeColor = colors[index % colors.length];
      
      categoryTitle.innerHTML = `<span style="display: inline-block; background: ${badgeColor}; color: white; padding: 3px 10px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${category}</span>`;
      categoryDiv.appendChild(categoryTitle);

      const itemsList = document.createElement('ul');
      itemsList.style.cssText = 'list-style: none; padding: 0; margin: 0;';

      items.forEach(item => {
        const li = document.createElement('li');
        li.style.cssText = `
          display: flex;
          gap: 16px;
          padding: 14px 16px;
          border-bottom: 1px solid #f0f0f0;
          transition: background-color 0.2s;
        `;
        
        li.addEventListener('mouseenter', () => {
          li.style.backgroundColor = '#fafafa';
        });
        li.addEventListener('mouseleave', () => {
          li.style.backgroundColor = 'transparent';
        });

        const date = document.createElement('div');
        date.style.cssText = `
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 600;
          color: ${badgeColor};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          min-width: 75px;
          text-align: right;
          padding-top: 2px;
        `;
        date.textContent = formatDate(item.date);

        const content = document.createElement('div');
        content.style.cssText = 'flex: 1; min-width: 0;';

        const title = document.createElement('h4');
        title.style.cssText = 'margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #333; line-height: 1.4;';
        title.textContent = item.title;

        const description = document.createElement('p');
        description.style.cssText = 'margin: 0; font-size: 13px; color: #666; line-height: 1.6;';
        description.textContent = item.description;

        content.appendChild(title);
        content.appendChild(description);

        li.appendChild(date);
        li.appendChild(content);
        itemsList.appendChild(li);
      });

      categoryDiv.appendChild(itemsList);
      elements.container.appendChild(categoryDiv);
    });
  };

  return {
    init,
    refresh: handleRefresh,
    render,
    reload: render,
    show: render,
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    CurrentAffairs.init();
  });
} else {
  CurrentAffairs.init();
}