// src/components/utils/RenderIfVisible.tsx

import React, { useState, useRef, useEffect, useCallback } from "react"; // Added useCallback

type Props = {
  initialVisible?: boolean;
  defaultHeight?: number;
  visibleOffset?: number;
  stayRendered?: boolean;
  root?: HTMLElement | null;
  rootElement?: string;
  rootElementClass?: string;
  placeholderElement?: string;
  placeholderElementClass?: string;
  children: React.ReactNode;
};

const RenderIfVisible = ({
  initialVisible = false,
  defaultHeight = 300,
  visibleOffset = 3000,
  stayRendered = false,
  root = null,
  rootElement = "div",
  rootElementClass = "",
  placeholderElement = "div",
  placeholderElementClass = "",
  children,
}: Props) => {
  const [shouldRender, setShouldRender] = useState<boolean>(initialVisible);
  const intersectionRef = useRef<HTMLDivElement>(null);
  const elementHeight = useRef<number>(defaultHeight);

  const updateHeight = useCallback(() => {
    if (intersectionRef.current && shouldRender) {
      const measuredHeight = intersectionRef.current.offsetHeight;
      if (measuredHeight > 0 && measuredHeight !== elementHeight.current) {
        elementHeight.current = measuredHeight;
      }
    }
  }, [shouldRender]);

  useEffect(() => {
    if (intersectionRef.current && shouldRender) {
      const localRef = intersectionRef.current;
      const resizeObserver = new ResizeObserver(() => {
        updateHeight();
      });
      resizeObserver.observe(localRef);
      return () => resizeObserver.unobserve(localRef);
    }
  }, [shouldRender, updateHeight]);

  useEffect(() => {
    if (intersectionRef.current) {
      const localRef = intersectionRef.current;
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          setShouldRender((prev) => {
            if (entry.isIntersecting) {
              return true;
            } else if (prev) {
              if (localRef.offsetHeight > 0) {
                elementHeight.current = localRef.offsetHeight;
              }
            }
            return stayRendered ? prev : false;
          });
        },
        { root, rootMargin: `${visibleOffset}px 0px ${visibleOffset}px 0px` }
      );

      observer.observe(localRef);
      return () => {
        if (localRef) {
          observer.unobserve(localRef);
        }
      };
    }
    return () => {};
  }, [root, visibleOffset, stayRendered]);

  const isCurrentlyRendered =
    shouldRender || (stayRendered && elementHeight.current > 0);

  const contentToRender = isCurrentlyRendered ? (
    <>{children}</>
  ) : (
    React.createElement(placeholderElement, {
      className: placeholderElementClass,
      style: {
        height:
          elementHeight.current > 0 ? elementHeight.current : defaultHeight,
      },
    })
  );

  return React.createElement(rootElement, {
    ref: intersectionRef,
    className: `renderIfVisible-root ${rootElementClass}`,
    children: contentToRender,
  });
};

export default RenderIfVisible;
