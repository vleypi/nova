// Side-effect-импорты регистрируют каждый handler в глобальном реестре element-registry
// при первом упоминании этого файла (обычно из BoardEngine). Без этих импортов getHandler
// бросит "No element handler registered". Порядок не важен.
import "./handlers/stroke.handler";
import "./handlers/text.handler";
import "./handlers/connector.handler";
import "./handlers/sticky.handler";
import "./handlers/image.handler";
import "./handlers/shape.handler";

// Реэкспорт public API реестра, чтобы потребители импортировали одно место.
export { getHandler, registerHandler } from "./element-registry";
export type {
  IElementHandler,
  IElementResolver,
} from "./interfaces/element-handler";
