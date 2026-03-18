const STATUS_MESSAGES = {
  loading: null,
  ready: null,
  camera_denied: {
    title: "카메라 권한이 필요합니다",
    detail: "브라우저에서 카메라 권한을 허용한 뒤 페이지를 새로고침하세요."
  },
  camera_unavailable: {
    title: "카메라를 사용할 수 없습니다",
    detail: "카메라 장치와 브라우저 지원 상태를 확인한 뒤 다시 열어보세요."
  },
  model_load_failed: {
    title: "손 추적 모델을 불러오지 못했습니다",
    detail: "로컬 자산 경로를 확인하고 정적 서버에서 다시 실행하세요."
  }
};

export function createStatusOverlay(rootElement) {
  const titleElement = rootElement.querySelector(".status-title");
  const detailElement = rootElement.querySelector(".status-detail");

  function setState(state) {
    const message = STATUS_MESSAGES[state] || null;
    if (!message) {
      rootElement.hidden = true;
      return;
    }

    titleElement.textContent = message.title;
    detailElement.textContent = message.detail;
    rootElement.hidden = false;
  }

  return {
    setState
  };
}
