import { useEffect, useMemo, useState } from 'react';

const getTimeRemaining = (endTime) => {
  const difference = endTime - new Date().getTime();

  if (difference <= 0) {
    return {
      total: 0,
      hours: '00',
      minutes: '00',
      seconds: '00',
    };
  }

  const totalSeconds = Math.floor(difference / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return {
    total: difference,
    hours,
    minutes,
    seconds,
  };
};

const TopBanner = () => {
  const endTime = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(24, 0, 0, 0);
    return end.getTime();
  }, []);

  const [timeRemaining, setTimeRemaining] = useState(() => getTimeRemaining(endTime));
  const [isVisible, setIsVisible] = useState(() => timeRemaining.total > 0);

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setTimeRemaining((prev) => {
        const updated = getTimeRemaining(endTime);

        if (updated.total <= 0) {
          setIsVisible(false);
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [endTime, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 w-full bg-red-600 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-2 text-sm font-semibold sm:text-base">
        <span className="mr-2">🔥 Up to 35% off all posters! Use code: POSTER35</span>
        <span className="rounded bg-white/20 px-2 py-1 font-bold">
          {timeRemaining.hours}:{timeRemaining.minutes}:{timeRemaining.seconds} left
        </span>
      </div>
    </div>
  );
};

export default TopBanner;
