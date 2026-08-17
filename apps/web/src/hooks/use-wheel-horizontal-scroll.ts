import { useCallback, useEffect, useState } from 'react';

type UseWheelHorizontalScrollOptions = {
  /** 滚轮灵敏度倍率，默认 1 */
  sensitivity?: number;
};

/**
 * 让横向可滚动的容器支持滚轮横向滚动：
 * 鼠标滚轮（含触控板）悬停在容器上滚动时，滚动方向会被转换为水平方向；
 * 当容器没有横向溢出时不拦截事件，保留页面默认的纵向滚动行为。
 *
 * 使用回调 ref + state 而非 useRef：回调 ref 在节点挂载、卸载、
 * 替换时都会被调用并触发重渲染，使 useEffect 依赖的 `container`
 * 始终与真实 DOM 节点同步，监听器随节点生命周期正确绑定/清理。
 */
export function useWheelHorizontalScroll(options: UseWheelHorizontalScrollOptions = {}) {
  const { sensitivity = 1 } = options;
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const containerRef = useCallback((node: HTMLElement | null) => {
    setContainer(node);
  }, []);

  useEffect(() => {
    if (!container) return;
    // 守卫后复制为普通局部变量，避免闭包内丢失类型收窄
    const el = container;

    function onWheel(event: WheelEvent) {
      // 容器无横向溢出时，交给浏览器默认行为（例如页面纵向滚动）
      if (el.scrollWidth <= el.clientWidth + 1) return;
      event.preventDefault();
      // deltaMode: 0 像素、1 行、2 页
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientHeight : 1;
      el.scrollLeft += (event.deltaY + event.deltaX) * scale * sensitivity;
    }

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [container, sensitivity]);

  return containerRef;
}
