// 对应《虚拟游戏》私有档案当前的 22 张案件卡与 12 张白板。数字为现场揭示步数。
export const reviewBoardSteps = [8, 9, 9, 9, 9, 9, 9, 9, 10, 9, 9, 9, 9, 9, 9, 10, 11, 9, 9, 12, 12, 12];

export function linkReviewBoard(workspaces) {
  const review = workspaces.find(({ deck }) => deck.classList.contains('md-case-workspace'));
  const board = workspaces.find(({ deck }) => !deck.classList.contains('md-case-workspace'));
  if (review?.slides.length !== reviewBoardSteps.length || board?.slides.length !== 12) return;

  const doc = review.deck.ownerDocument;
  const addButton = (workspace, label, click) => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', click);
    workspace.deck.querySelector('.md-trace-nav').append(button);
    return button;
  };
  let caseIndex = 0;
  let boardStep = reviewBoardSteps[0];

  const preview = doc.createElement('details');
  preview.className = 'md-case-detail md-linked-board';
  const summary = doc.createElement('summary');
  const image = doc.createElement('img');
  const instructions = doc.createElement('p');
  preview.append(summary, image, instructions);
  const refreshPreview = () => {
    const slide = board.slides[boardStep - 1];
    summary.textContent = `对应白板 · 第 ${boardStep} 步`;
    image.src = slide.querySelector('img').src;
    image.alt = `第 ${boardStep} 步的白板全图`;
    instructions.textContent = slide.querySelectorAll('dd')[1].textContent;
    const notes = review.slides[caseIndex].querySelector('.md-trace-notes');
    notes.querySelector('dl').after(preview);
  };

  const show = (from, to) => {
    from.deck.close();
    to.open();
  };
  const reviewButton = addButton(board, '相关案件', () => show(board, review));
  reviewButton.dataset.workspaceLinked = '';
  const updateBoardLink = () => {
    const related = reviewBoardSteps.flatMap((step, index) => step === boardStep ? [index] : []);
    reviewButton.disabled = !related.length;
    const slide = board.slides[boardStep - 1];
    slide.querySelector('.md-linked-cases')?.remove();
    if (!related.length) return;
    const list = doc.createElement('div');
    list.className = 'md-linked-cases';
    for (const index of related) {
      const button = doc.createElement('button');
      button.type = 'button';
      button.textContent = review.slides[index].querySelector('h4').textContent;
      button.addEventListener('click', () => {
        review.goTo(index);
        show(board, review);
      });
      list.append(button);
    }
    slide.querySelector('.md-trace-notes').append(list);
  };
  const boardButton = addButton(review, '对应白板', () => {
    board.goTo(reviewBoardSteps[caseIndex] - 1, false);
    boardStep = reviewBoardSteps[caseIndex];
    updateBoardLink();
    show(review, board);
  });
  boardButton.dataset.workspaceLinked = '';
  review.deck.addEventListener('juben-workspace-step', ({ detail }) => {
    caseIndex = detail;
    boardStep = reviewBoardSteps[detail];
    board.goTo(boardStep - 1, false);
    preview.open = false;
    refreshPreview();
    updateBoardLink();
  });
  board.deck.addEventListener('juben-workspace-step', ({ detail }) => {
    boardStep = detail + 1;
    const related = reviewBoardSteps.indexOf(boardStep);
    if (related !== -1 && reviewBoardSteps[caseIndex] !== boardStep) {
      caseIndex = related;
      review.goTo(caseIndex, false);
    }
    if (related !== -1) refreshPreview();
    updateBoardLink();
  });
  refreshPreview();
  if (board.deck.open) boardStep = 1;
  else board.goTo(boardStep - 1, false);
  updateBoardLink();
}
