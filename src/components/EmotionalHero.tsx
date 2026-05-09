interface Props {
  photoUrl: string;
  petName: string;
}

export default function EmotionalHero({ photoUrl, petName }: Props) {
  return (
    <div className="mx-5 mt-3 mb-5 rounded-3xl overflow-hidden relative"
      style={{
        background: 'linear-gradient(180deg, #f6ecdd 0%, #f0dfc6 100%)',
        border: '1px solid rgba(201,166,110,0.22)',
        boxShadow: '0 14px 44px rgba(86,55,20,0.14)',
      }}>
      <div className="relative w-full aspect-[4/5] overflow-hidden">
        <img src={photoUrl} alt={petName} className="w-full h-full object-cover" style={{ objectPosition: 'center' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(246,236,221,0) 55%, rgba(246,236,221,0.92) 100%)' }} />
      </div>

      <div className="px-6 pt-4 pb-6">
        <p className="text-[10px] uppercase tracking-[0.3em] font-medium"
          style={{ color: 'rgba(120,82,40,0.75)' }}>
          A quiet beginning
        </p>

        <p className="mt-3 text-[17px] font-light leading-[1.7]" style={{ color: 'rgba(60,40,18,0.92)' }}>
          Some moments are too small to post,
          <br />
          but too precious to lose.
        </p>

        <div className="mt-4 space-y-1.5 text-[13.5px] font-light leading-[1.85]" style={{ color: 'rgba(80,55,28,0.78)' }}>
          <p>A quiet hug.</p>
          <p>A slower heartbeat.</p>
          <p>A walk you didn&rsquo;t know you would remember.</p>
        </div>

        <p className="mt-4 text-[14px] font-medium leading-[1.65]" style={{ color: 'rgba(60,40,18,0.92)' }}>
          BONDA turns those invisible moments into Presence.
        </p>

        <div className="mt-5 pt-4 border-t space-y-3"
          style={{ borderColor: 'rgba(120,82,40,0.14)' }}>
          <p className="text-[12.5px] font-light leading-[1.7]" style={{ color: 'rgba(80,55,28,0.8)' }}>
            Most AI starts with prompts.
            <br />
            <span className="font-medium" style={{ color: 'rgba(60,40,18,0.95)' }}>BONDA starts with relationships.</span>
          </p>
          <p className="text-[12.5px] font-light leading-[1.7]" style={{ color: 'rgba(80,55,28,0.8)' }}>
            AI generates responses.
            <br />
            <span className="font-medium" style={{ color: 'rgba(60,40,18,0.95)' }}>BONDA generates Presence.</span>
          </p>
          <p className="text-[12.5px] italic leading-[1.7]" style={{ color: 'rgba(100,68,32,0.85)' }}>
            The relationship is the interface.
          </p>
        </div>
      </div>
    </div>
  );
}
