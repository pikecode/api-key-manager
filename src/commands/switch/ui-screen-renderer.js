/**
 * UI Screen Renderer
 * 通用界面渲染工具，减少重复代码
 */

const { UIHelper } = require('../utils/ui-helper');

class UIScreenRenderer {
  constructor(baseCommand) {
    this.baseCommand = baseCommand;
  }

  /**
   * 渲染标准页面（标题+内容+操作提示）
   */
  renderPage(options) {
    const { title, icon, hints, content } = options;

    this.baseCommand.clearScreen();

    if (title) {
      console.log(UIHelper.createTitle(title, icon || UIHelper.icons.info));
      console.log();
    }

    if (hints) {
      console.log(UIHelper.createHintLine(hints));
      console.log();
    }

    if (content) {
      if (typeof content === 'function') {
        content();
      } else {
        console.log(content);
      }
      console.log();
    }
  }

  /**
   * 渲染带卡片的页面
   */
  renderCardPage(options) {
    const { title, icon, cardTitle, cardContent, cardIcon, hints } = options;

    this.baseCommand.clearScreen();

    if (title) {
      console.log(UIHelper.createTitle(title, icon || UIHelper.icons.info));
      console.log();
    }

    if (cardTitle) {
      console.log(UIHelper.createCard(cardTitle, cardContent, cardIcon));
      console.log();
    }

    if (hints) {
      console.log(UIHelper.createHintLine(hints));
      console.log();
    }
  }

  /**
   * 渲染简单的确认页面
   */
  renderConfirmPage(title, message, icon) {
    this.renderPage({
      title,
      icon: icon || UIHelper.icons.warning,
      content: message
    });
  }
}

module.exports = { UIScreenRenderer };
