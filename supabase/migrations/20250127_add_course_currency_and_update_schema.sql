-- Add course_currency column to masterclass_page_content table
ALTER TABLE public.masterclass_page_content
ADD COLUMN course_currency text NOT NULL DEFAULT 'UGX'::text;

-- Add check constraint for valid currencies
ALTER TABLE public.masterclass_page_content
ADD CONSTRAINT masterclass_page_content_course_currency_check CHECK (
  course_currency = ANY (
    array[
      'USD'::text,
      'EUR'::text,
      'GBP'::text,
      'UGX'::text,
      'KES'::text,
      'CAD'::text,
      'AUD'::text
    ]
  )
);

-- Update student_enrollments table to include currency field
ALTER TABLE public.student_enrollments
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'UGX'::text;

-- Add check constraint for valid currencies in student_enrollments
ALTER TABLE public.student_enrollments
ADD CONSTRAINT student_enrollments_currency_check CHECK (
  currency = ANY (
    array[
      'USD'::text,
      'EUR'::text,
      'GBP'::text,
      'UGX'::text,
      'KES'::text,
      'CAD'::text,
      'AUD'::text
    ]
  )
);

-- Create index on course_currency for faster lookups
CREATE INDEX IF NOT EXISTS idx_masterclass_page_content_course_currency 
ON public.masterclass_page_content USING btree (course_currency) 
TABLESPACE pg_default;

-- Create index on student_enrollments currency for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_enrollments_currency 
ON public.student_enrollments USING btree (currency) 
TABLESPACE pg_default;
