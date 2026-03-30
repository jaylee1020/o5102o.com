import { registerServiceWorker } from "/shared/site.js";

const REPOSITORIES_ENDPOINT =
  "https://api.github.com/users/jaylee1020/repos?sort=updated&per_page=5&type=public";

const listElement = document.getElementById("list");
const statusElement = document.getElementById("status");

function formatRelativeTime(value) {
  const updatedAt = new Date(value);
  if (Number.isNaN(updatedAt.valueOf())) {
    return "";
  }

  const minutes = Math.floor((Date.now() - updatedAt.getTime()) / 60000);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d`;
  }

  return `${Math.floor(days / 30)}mo`;
}

function createRepositoryRow(repository) {
  const anchor = document.createElement("a");
  anchor.className = "list-row";
  anchor.href = repository.html_url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";

  const name = document.createElement("span");
  name.textContent = repository.name;

  const meta = document.createElement("span");
  meta.className = "meta";

  const parts = [];
  if (repository.language) {
    parts.push(repository.language);
  }

  const relativeTime = formatRelativeTime(repository.updated_at);
  if (relativeTime) {
    parts.push(relativeTime);
  }

  meta.textContent = parts.join(" · ");

  anchor.append(name, meta);
  return anchor;
}

function setLoadingState(text) {
  statusElement.hidden = false;
  statusElement.textContent = text;
  listElement.replaceChildren();
}

function showRetryState() {
  statusElement.hidden = false;
  statusElement.textContent = "불러오기 실패. ";

  const retryButton = document.createElement("button");
  retryButton.className = "retry-button";
  retryButton.type = "button";
  retryButton.textContent = "[다시 시도]";
  retryButton.addEventListener("click", loadRepositories);

  statusElement.appendChild(retryButton);
}

async function loadRepositories() {
  setLoadingState("불러오는 중...");

  try {
    const response = await fetch(REPOSITORIES_ENDPOINT);
    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status}`);
    }

    const repositories = await response.json();
    if (!Array.isArray(repositories) || repositories.length === 0) {
      statusElement.hidden = false;
      statusElement.textContent = "프로젝트 없음.";
      return;
    }

    statusElement.hidden = true;
    listElement.replaceChildren(...repositories.map(createRepositoryRow));
  } catch (error) {
    console.error(error);
    showRetryState();
  }
}

loadRepositories();
registerServiceWorker();
