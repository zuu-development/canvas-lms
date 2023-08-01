/*
 * Copyright (C) 2023 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import {useScope} from '@canvas/i18n'
import {SimpleSelect} from '@instructure/ui-simple-select'
import React, {useCallback, useRef, useEffect, useState} from 'react'
import moment, {Moment} from 'moment-timezone'
import {
  FrequencyOptionValue,
  FrequencyOption,
  FrequencyOptionsArray,
  generateFrequencyOptions,
  generateFrequencyRRule,
  getSelectTextWidth,
  rruleToFrequencyOptionValue,
} from './FrequencyPickerUtils'
import CustomRecurrenceModal from '../RecurringEvents/CustomRecurrenceModal/CustomRecurrenceModal'

const {Option} = SimpleSelect as any
const I18n = useScope('calendar_frequency_picker')

export type OnFrequencyChange = (frequency: FrequencyOptionValue, RRule: string | null) => void
export type FrequencyPickerWidth = 'auto' | 'fit'

export type FrequencyPickerProps = {
  readonly date: Date | string
  readonly timezone: string
  readonly initialFrequency: FrequencyOptionValue
  readonly rrule?: string
  readonly locale: string
  readonly width?: FrequencyPickerWidth
  readonly onChange: OnFrequencyChange
}

function getFrequencySelectWidth(width: FrequencyPickerWidth, options: FrequencyOptionsArray) {
  return width === 'fit' ? getSelectTextWidth(options.map(opt => opt.label)) : 'auto'
}

export default function FrequencyPicker({
  date,
  timezone,
  initialFrequency,
  rrule,
  locale,
  width = 'fit',
  onChange,
}: FrequencyPickerProps) {
  const [frequency, setFrequency] = useState<FrequencyOptionValue>(initialFrequency)
  const [parsedMoment, setParsedMoment] = useState<Moment>(moment.tz(date, timezone))
  const [isModalOpen, setIsModalOpen] = useState<boolean>(initialFrequency === 'custom')
  const [currRRule, setCurrRRule] = useState<string | null>(() => {
    return rrule || generateFrequencyRRule(frequency, parsedMoment)
  })
  const [customRRule, setCustomRRule] = useState<string | null>(() => {
    return frequency === 'saved-custom' && rrule ? rrule : null
  })
  const [options, setOptions] = useState<FrequencyOptionsArray>(
    generateFrequencyOptions(parsedMoment, locale, timezone, customRRule)
  )
  const [selectTextWidth, setSelectTextWidth] = useState<string>(() =>
    getFrequencySelectWidth(width, options)
  )
  const freqPickerRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (frequency !== 'custom') {
      onChange(frequency, currRRule)
    }
  }, [currRRule, frequency, onChange])

  useEffect(() => {
    setFrequency(initialFrequency)
  }, [initialFrequency])

  useEffect(() => {
    const newMoment = moment(date)
    setParsedMoment(newMoment)
    if (frequency !== 'custom' && frequency !== 'saved-custom') {
      setCurrRRule(generateFrequencyRRule(frequency, newMoment))
    }
  }, [date, frequency])

  useEffect(() => {
    const newOpts = generateFrequencyOptions(parsedMoment, locale, timezone, customRRule)
    if (
      newOpts.length !== options.length ||
      newOpts.some((opt, i) => opt.label !== options[i].label)
    ) {
      setOptions(newOpts)
      setSelectTextWidth(getFrequencySelectWidth(width, newOpts))
    }
  }, [customRRule, locale, options, parsedMoment, timezone, width])

  const handleSelectOption = useCallback(
    (e: any, option: FrequencyOption) => {
      setFrequency(option.id)
      if (option.id === 'custom') {
        setIsModalOpen(true)
      } else if (option.id === 'saved-custom') {
        setCurrRRule(customRRule)
      } else {
        const newRRule = generateFrequencyRRule(option.id, parsedMoment)
        setCurrRRule(newRRule)
      }
    },
    [customRRule, parsedMoment]
  )

  const handleCloseModal = useCallback(() => {
    freqPickerRef.current?.focus()
  }, [])

  const handleDismissModal = useCallback(() => {
    setIsModalOpen(false)
    let freq: FrequencyOptionValue
    if (currRRule === null) {
      freq = 'not-repeat'
    } else {
      freq = rruleToFrequencyOptionValue(parsedMoment, currRRule)
      if (freq === 'custom') {
        freq = 'saved-custom'
      }
    }
    setFrequency(freq)
  }, [currRRule, parsedMoment])

  const handleSaveCustomRecurrence = useCallback(
    (newRRule: string) => {
      setIsModalOpen(false)
      setCurrRRule(newRRule)
      setCustomRRule(newRRule)
      setFrequency('saved-custom')
      const newOpts = generateFrequencyOptions(parsedMoment, locale, timezone, newRRule)
      setOptions(newOpts)
      setSelectTextWidth(getFrequencySelectWidth(width, newOpts))
    },
    [locale, parsedMoment, timezone, width]
  )

  return (
    <>
      <SimpleSelect
        inputRef={node => {
          freqPickerRef.current = node
        }}
        renderLabel={I18n.t('frequency', 'Frequency:')}
        data-testid="frequency-picker"
        value={frequency}
        width={selectTextWidth}
        onChange={handleSelectOption}
      >
        {options.map(opt => (
          <Option id={opt.id} key={opt.id} value={opt.id}>
            {opt.label}
          </Option>
        ))}
      </SimpleSelect>
      <CustomRecurrenceModal
        eventStart={parsedMoment.toISOString(true)}
        locale={locale}
        timezone={timezone}
        courseEndAt={undefined}
        RRULE={currRRule || ''}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onDismiss={handleDismissModal}
        onSave={handleSaveCustomRecurrence}
      />
    </>
  )
}
