'use client'
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAppContext } from '@/context/AppContext';
import toast from 'react-hot-toast';

const OrderConfirmation = () => {
  const { setCartItems, getToken } = useAppContext();
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      (async () => {
        try {
          const token = await getToken();
          const { data } = await axios.post(
            '/api/stripe/confirm',
            { sessionId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (data.success) {
            setCartItems({});
            toast.success('Order placed successfully');
          } else {
            toast.error(data.message);
          }
        } catch (error) {
          toast.error(error.message);
        }
      })();
    }
  }, [searchParams, getToken, setCartItems]);

  return (
    <>
      <Navbar />
      <div className='h-screen flex flex-col justify-center items-center gap-5'>
        <div className='text-center text-2xl font-semibold'>Order Confirmed</div>
      </div>
      <Footer />
    </>
  );
};

export default OrderConfirmation;
