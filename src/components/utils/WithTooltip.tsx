//@ts-nocheck

import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
import Tooltip from "./Tooltip";
import clsx from "clsx";

interface WithTooltipProps {
  children: React.ReactElement;
  tooltipContent: React.ReactNode;
  position?: "top" | "right" | "bottom" | "left";
  offset?: number;
  delay?: number;
  hideDuration?: number;
}

const WithTooltip: React.FC<WithTooltipProps> = ({
  children,
  tooltipContent,
  position = "top",
  offset = 10,
  delay = 300,
  hideDuration = 200,
}) => {
  const [showPortal, setShowPortal] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;

      switch (position) {
        case "top":
          top = triggerRect.top - tooltipRect.height - offset;
          left =
            triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          break;
        case "bottom":
          top = triggerRect.bottom + offset;
          left =
            triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          break;
        case "left":
          top =
            triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.left - tooltipRect.width - offset;
          break;
        case "right":
          top =
            triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.right + offset;
          break;
      }

      setTooltipStyle({
        position: "absolute",
        top: `${top + window.scrollY}px`,
        left: `${left + window.scrollX}px`,
        zIndex: 9999,
      });
    }
  }, [offset, position]);

  useEffect(() => {
    if (showContent) {
      calculatePosition();
      window.addEventListener("resize", calculatePosition);
      window.addEventListener("scroll", calculatePosition);
    }

    return () => {
      window.removeEventListener("resize", calculatePosition);
      window.removeEventListener("scroll", calculatePosition);
    };
  }, [showContent, calculatePosition]);

  const handleShow = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setShowPortal(true);
    timeoutRef.current = window.setTimeout(() => {
      setShowContent(true);

      setTimeout(calculatePosition, 0);
    }, delay);
  }, [delay, calculatePosition]);

  const handleHide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setShowContent(false);

    hideTimeoutRef.current = window.setTimeout(() => {
      setShowPortal(false);
    }, hideDuration);
  }, [hideDuration]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const composedRef = useCallback(
    (el: HTMLElement | null) => {
      (triggerRef as React.MutableRefObject<HTMLElement | null>).current = el;
      if (typeof children.ref === "function") {
        children.ref(el);
      } else if (children.ref && typeof children.ref === "object") {
        (children.ref as React.MutableRefObject<HTMLElement | null>).current =
          el;
      }
    },
    [children.ref]
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      handleShow();
      if (children.props.onMouseEnter) children.props.onMouseEnter(e);
    },
    [children.props.onMouseEnter, handleShow]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      handleHide();
      if (children.props.onMouseLeave) children.props.onMouseLeave(e);
    },
    [children.props.onMouseLeave, handleHide]
  );

  const handleFocus = useCallback(
    (e: React.FocusEvent) => {
      handleShow();
      if (children.props.onFocus) children.props.onFocus(e);
    },
    [children.props.onFocus, handleShow]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      handleHide();
      if (children.props.onBlur) children.props.onBlur(e);
    },
    [children.props.onBlur, handleHide]
  );

  const triggerElement = React.cloneElement(children, {
    ref: composedRef,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
  });

  return (
    <>
      {triggerElement}
      {showPortal &&
        ReactDOM.createPortal(
          <div ref={tooltipRef} style={tooltipStyle}>
            <Tooltip
              className={clsx(
                showContent ? "opacity-100 scale-100" : "opacity-0 scale-95"
              )}
            >
              {tooltipContent}
            </Tooltip>
          </div>,
          document.body
        )}
    </>
  );
};

export default WithTooltip;
