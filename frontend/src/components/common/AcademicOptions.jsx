import React from 'react';
import { DEPARTMENTS, SEMESTERS } from '../../constants/academics';

export const DepartmentOptions = ({ placeholder }) => (
  <>
    {placeholder && <option value="">{placeholder}</option>}
    {DEPARTMENTS.map((department) => (
      <option key={department} value={department}>{department}</option>
    ))}
  </>
);

export const SemesterOptions = ({ placeholder }) => (
  <>
    {placeholder && <option value="">{placeholder}</option>}
    {SEMESTERS.map((semester) => (
      <option key={semester} value={semester}>Semester {semester}</option>
    ))}
  </>
);
