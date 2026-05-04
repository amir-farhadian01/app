import React, { useEffect, useState } from 'react';

export default function CMSInspector({ isActive }: { isActive: boolean }) {
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    console.log("CMSInspector isActive changed:", isActive);
    if (!isActive) {
      setHoveredElement(null);
      setSelectedElement(null);
      return;
    }

    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'CLEAR_SELECTION') {
        setSelectedElement(null);
      }
    };

    const handleMouseOver = (e: MouseEvent) => {
      if (!isActive) return;
      const target = e.target as HTMLElement;
      if (target === document.body || target === document.documentElement) return;
      setHoveredElement(target);
    };

    const handleClick = (e: MouseEvent) => {
      if (!isActive) return;
      const target = e.target as HTMLElement;
      if (target === document.body || target === document.documentElement) return;
      
      e.preventDefault();
      e.stopPropagation();

      setSelectedElement(target);
      const styles = window.getComputedStyle(target);
      
      const elementData = {
        tagName: target.tagName,
        id: target.id,
        className: typeof target.className === 'string' ? target.className : target.getAttribute('class') || '',
        textContent: target.textContent?.trim().slice(0, 50),
        styles: {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          padding: styles.padding,
          margin: styles.margin,
          borderRadius: styles.borderRadius,
          fontFamily: styles.fontFamily,
          textAlign: styles.textAlign
        },
        rect: target.getBoundingClientRect(),
        attributes: {
          src: target.tagName === 'IMG' ? (target as HTMLImageElement).src : undefined,
          alt: target.tagName === 'IMG' ? (target as HTMLImageElement).alt : undefined,
        }
      };

      window.parent.postMessage({ type: 'CMS_ELEMENT_SELECTED', element: elementData }, '*');
    };

    window.addEventListener('message', handleMessage);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('click', handleClick, true);
    };
  }, [isActive]);

  const renderHighlight = (el: HTMLElement, color: string, label: string) => {
    const rect = el.getBoundingClientRect();
    const classNameStr = typeof el.className === 'string' ? el.className : el.getAttribute('class') || '';
    const classLabel = classNameStr ? `.${classNameStr.split(' ')[0]}` : '';

    return (
      <div 
        style={{
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          border: `2px solid ${color}`,
          backgroundColor: `${color}1A`, // 10% opacity
          pointerEvents: 'none',
          zIndex: 999999,
          transition: 'all 0.1s ease-out'
        }}
      >
        <div style={{
          position: 'absolute',
          top: -24,
          left: 0,
          backgroundColor: color,
          color: 'white',
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          fontWeight: 'bold'
        }}>
          {label}: {el.tagName.toLowerCase()}{classLabel}
        </div>
      </div>
    );
  };

  return (
    <div className={isActive ? 'block' : 'hidden'}>
      {hoveredElement && !selectedElement && renderHighlight(hoveredElement, '#3b82f6', 'HOVER')}
      {selectedElement && renderHighlight(selectedElement, '#10b981', 'SELECTED')}
    </div>
  );
}
